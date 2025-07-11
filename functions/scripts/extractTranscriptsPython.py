#!/usr/bin/env python3

import sys
import os
import json
import time
import random

# Add local modules directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'python_modules'))

import requests
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.proxies import WebshareProxyConfig
from requests import Session

# Webshare API configuration
WEBSHARE_API_KEY = os.environ.get('WEBSHARE_API_KEY', '')
if not WEBSHARE_API_KEY:
    print("Warning: WEBSHARE_API_KEY environment variable not set", file=sys.stderr)

WEBSHARE_API_URL = "https://proxy.webshare.io/api/v2/proxy/list/"

def fetch_webshare_proxies():
    """Fetch proxy list from Webshare API"""
    try:
        if not WEBSHARE_API_KEY:
            print("Error: No Webshare API key provided", file=sys.stderr)
            return []
            
        headers = {
            "Authorization": f"Token {WEBSHARE_API_KEY}"
        }
        
        # Add required parameters for the API  
        params = {
            'mode': 'backbone',  # Use backbone mode for residential proxies
            'page_size': 25
        }
        
        print(f"Fetching proxies from Webshare API with key: {WEBSHARE_API_KEY[:5]}...", file=sys.stderr)
        response = requests.get(WEBSHARE_API_URL, headers=headers, params=params)
        
        if response.status_code != 200:
            print(f"Webshare API error: {response.status_code} - {response.text}", file=sys.stderr)
            return []
            
        response.raise_for_status()
        
        data = response.json()
        proxies = []
        
        for proxy_data in data.get('results', []):
            proxy_config = {
                'proxy_address': proxy_data['proxy_address'],
                'port': proxy_data['port'],
                'username': proxy_data['username'],
                'password': proxy_data['password']
            }
            proxies.append(proxy_config)
        
        print(f"Fetched {len(proxies)} proxies from Webshare", file=sys.stderr)
        return proxies
        
    except Exception as e:
        print(f"Failed to fetch Webshare proxies: {e}", file=sys.stderr)
        return []

def create_proxy_config(proxy_data):
    """Create a proxy configuration for youtube-transcript-api"""
    if not proxy_data:
        return None
    
    try:
        proxy_config = WebshareProxyConfig(
            proxy_username=proxy_data['username'],
            proxy_password=proxy_data['password']
        )
        return proxy_config
    except Exception as e:
        print(f"Failed to create proxy config: {e}", file=sys.stderr)
        return None

def create_api_instance(proxy_config=None, use_session=True):
    """Create a YouTube Transcript API instance with optimal configuration"""
    
    if use_session:
        # Create a session with browser-like headers
        http_client = Session()
        http_client.headers.update({
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate",
            "DNT": "1",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
        })
        
        if proxy_config:
            return YouTubeTranscriptApi(http_client=http_client, proxy_config=proxy_config)
        else:
            return YouTubeTranscriptApi(http_client=http_client)
    else:
        if proxy_config:
            return YouTubeTranscriptApi(proxy_config=proxy_config)
        else:
            return YouTubeTranscriptApi()

def extract_transcript(video_id, retry_count=3, delay_range=(1, 3)):
    """Extract transcript with retry logic, rate limiting, and proxy rotation"""
    
    # Fetch available proxies from Webshare
    available_proxies = fetch_webshare_proxies()
    
    for attempt in range(retry_count):
        try:
            # Add random delay to avoid pattern detection
            if attempt > 0:
                delay = random.uniform(delay_range[0], delay_range[1])
                print(f"Waiting {delay:.1f} seconds before retry {attempt + 1}/{retry_count}", file=sys.stderr)
                time.sleep(delay)
            
            # Select a random proxy for this attempt
            proxy_config = None
            if available_proxies:
                proxy_data = random.choice(available_proxies)
                proxy_config = create_proxy_config(proxy_data)
                if proxy_config:
                    print(f"Using proxy {proxy_data['proxy_address']}:{proxy_data['port']}", file=sys.stderr)
            
            # Create API instance with or without proxy
            ytt_api = create_api_instance(proxy_config=proxy_config)
            
            # Try to get the transcript with language preferences
            fetched_transcript = ytt_api.fetch(video_id, languages=['en', 'en-US', 'en-GB'])
            
            # Convert FetchedTranscript to list of dictionaries
            transcript_segments = []
            for snippet in fetched_transcript:
                transcript_segments.append({
                    'text': snippet.text,
                    'start': snippet.start,
                    'duration': snippet.duration
                })
            
            # Format the transcript
            formatted_transcript = ' '.join([snippet.text for snippet in fetched_transcript])
            
            # Return both the raw segments and formatted text
            result = {
                'success': True,
                'segments': transcript_segments,
                'fullText': formatted_transcript,
                'segmentCount': len(fetched_transcript),
                'attempt': attempt + 1,
                'proxy_used': f"{proxy_data['proxy_address']}:{proxy_data['port']}" if proxy_config and proxy_data else "none"
            }
            
            return result
            
        except Exception as e:
            error_msg = str(e)
            
            # Check for specific error types
            if "IP" in error_msg or "blocked" in error_msg.lower() or "429" in error_msg:
                if attempt < retry_count - 1:
                    # Exponential backoff for IP blocks, but shorter since we're using proxies
                    wait_time = (2 ** attempt) * 30  # 30s, 60s, 120s (shorter than before)
                    print(f"IP/Rate limit detected, waiting {wait_time} seconds before retry {attempt + 2}/{retry_count}", file=sys.stderr)
                    time.sleep(wait_time)
                    continue
                else:
                    return {
                        'success': False,
                        'error': f'IP blocked/rate limited after {retry_count} attempts: {error_msg}',
                        'errorType': 'IP_BLOCKED',
                        'segments': [],
                        'fullText': '',
                        'segmentCount': 0
                    }
            
            elif "transcript" in error_msg.lower() or "available" in error_msg.lower():
                return {
                    'success': False,
                    'error': f'No transcript available: {error_msg}',
                    'errorType': 'NO_TRANSCRIPT',
                    'segments': [],
                    'fullText': '',
                    'segmentCount': 0
                }
            
            else:
                if attempt < retry_count - 1:
                    # Short delay for other errors
                    delay = random.uniform(2, 5)
                    print(f"General error, waiting {delay:.1f} seconds before retry {attempt + 2}/{retry_count}: {error_msg}", file=sys.stderr)
                    time.sleep(delay)
                    continue
                else:
                    return {
                        'success': False,
                        'error': f'Failed after {retry_count} attempts: {error_msg}',
                        'errorType': 'UNKNOWN',
                        'segments': [],
                        'fullText': '',
                        'segmentCount': 0
                    }
    
    return {
        'success': False,
        'error': f'All {retry_count} attempts failed',
        'errorType': 'MAX_RETRIES_EXCEEDED',
        'segments': [],
        'fullText': '',
        'segmentCount': 0
    }

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({'success': False, 'error': 'Usage: python extractTranscriptsPython.py <video_id>'}))
        sys.exit(1)
    
    video_id = sys.argv[1]
    result = extract_transcript(video_id)
    print(json.dumps(result)) 
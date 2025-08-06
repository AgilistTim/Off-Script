# OffScript User Journey Guide

## Executive Summary

OffScript is an AI-led, voice-first career exploration platform designed to help young adults navigate career uncertainty through natural language conversations. The platform encourages experimentation and autonomy by using conversational AI to identify user goals, skills, and interests, suggesting non-linear career pathways, and supporting deeper exploration of career opportunities.

### Platform Overview

**Mission**: Empower young adults to discover meaningful career paths through personalized, voice-driven conversations and data-informed insights.

**Core Technology**:
- **Voice-First Interface**: ElevenLabs AI agent integration for natural conversations
- **AI Analysis**: OpenAI and Perplexity APIs for career insights and market data
- **Firebase Backend**: Scalable data storage and user management
- **Real-time Enhancement**: Dynamic career card generation and enrichment

### User Types

**Guest Users**:
- Unregistered visitors exploring career options
- Temporary localStorage-based data storage
- Limited feature access with migration incentives
- Privacy-focused with minimal data collection

**Registered Users**:
- Authenticated users with persistent Firebase profiles
- Enhanced career tracking and historical data
- Advanced voice context injection
- Comprehensive career enhancement features

### Key Features

- **Conversational Career Discovery**: Natural language exploration of interests and goals
- **Dynamic Career Cards**: AI-generated career recommendations with confidence scores
- **Voice Context Awareness**: ElevenLabs agents aware of user progress and preferences
- **Seamless Migration**: Guest-to-registered user data transfer with validation
- **Enhanced Insights**: Perplexity-powered market data and salary information
- **Persistent Progress**: Cross-session continuity and career journey tracking

## Table of Contents

### 1. [Platform Architecture](#1-platform-architecture)
- [1.1 System Overview](#11-system-overview)
- [1.2 Technology Stack](#12-technology-stack)
- [1.3 Data Flow Architecture](#13-data-flow-architecture)

### 2. [Database Architecture](#2-database-architecture)
- [2.1 Firebase Collections Overview](#21-firebase-collections-overview)
- [2.2 User Data Schema](#22-user-data-schema)
- [2.3 Career Guidance Schema](#23-career-guidance-schema)
- [2.4 Migration Tracking Schema](#24-migration-tracking-schema)
- [2.5 Data Relationships](#25-data-relationships)
- [2.6 Security Rules](#26-security-rules)

### 3. [Guest User Journey](#3-guest-user-journey)
- [3.1 Initial Landing and Session Initialization](#31-initial-landing-and-session-initialization)
- [3.2 Conversation Flow and Data Collection](#32-conversation-flow-and-data-collection)
- [3.3 Career Discovery Process](#33-career-discovery-process)
- [3.4 LocalStorage Persistence](#34-localstorage-persistence)
- [3.5 Conversion Triggers](#35-conversion-triggers)
- [3.6 Session Management](#36-session-management)

### 4. [Registered User Journey](#4-registered-user-journey)
- [4.1 Authentication and Onboarding](#41-authentication-and-onboarding)
- [4.2 Enhanced Feature Access](#42-enhanced-feature-access)
- [4.3 Persistent Data Management](#43-persistent-data-management)
- [4.4 Voice Context Integration](#44-voice-context-integration)
- [4.5 Career Progression Tracking](#45-career-progression-tracking)
- [4.6 Cross-Session Continuity](#46-cross-session-continuity)

### 5. [Voice Interaction Architecture](#5-voice-interaction-architecture)
- [5.1 ElevenLabs Integration](#51-elevenlabs-integration)
- [5.2 Dynamic Context Management](#52-dynamic-context-management)
- [5.3 Real-time Updates](#53-real-time-updates)
- [5.4 Security and Data Isolation](#54-security-and-data-isolation)
- [5.5 Career-Aware Conversations](#55-career-aware-conversations)
- [5.6 Context Injection Patterns](#56-context-injection-patterns)

### 6. [Career Enhancement Pipeline](#6-career-enhancement-pipeline)
- [6.1 Career Card Generation](#61-career-card-generation)
- [6.2 AI Analysis Integration](#62-ai-analysis-integration)
- [6.3 External API Enhancement](#63-external-api-enhancement)
- [6.4 Data Transformation](#64-data-transformation)
- [6.5 Validation and Persistence](#65-validation-and-persistence)
- [6.6 Enhancement Triggers](#66-enhancement-triggers)

### 7. [Data Migration and Session Management](#7-data-migration-and-session-management)
- [7.1 Migration Trigger Conditions](#71-migration-trigger-conditions)
- [7.2 Data Extraction Process](#72-data-extraction-process)
- [7.3 Firebase Serialization](#73-firebase-serialization)
- [7.4 Validation and Error Handling](#74-validation-and-error-handling)
- [7.5 Migration Tracking](#75-migration-tracking)
- [7.6 Rollback and Recovery](#76-rollback-and-recovery)

### 8. [Security and Privacy Considerations](#8-security-and-privacy-considerations)
- [8.1 Guest Privacy Protections](#81-guest-privacy-protections)
- [8.2 Data Isolation Mechanisms](#82-data-isolation-mechanisms)
- [8.3 Voice Context Security](#83-voice-context-security)
- [8.4 Firebase Security Rules](#84-firebase-security-rules)
- [8.5 Compliance Considerations](#85-compliance-considerations)
- [8.6 Security Best Practices](#86-security-best-practices)

### 9. [Technical Implementation Reference](#9-technical-implementation-reference)
- [9.1 Service Interfaces](#91-service-interfaces)
- [9.2 Code Examples](#92-code-examples)
- [9.3 Integration Patterns](#93-integration-patterns)
- [9.4 Troubleshooting Guide](#94-troubleshooting-guide)
- [9.5 Performance Considerations](#95-performance-considerations)
- [9.6 Developer Best Practices](#96-developer-best-practices)

### 10. [Appendices](#10-appendices)
- [10.1 API Reference](#101-api-reference)
- [10.2 Configuration Examples](#102-configuration-examples)
- [10.3 Deployment Patterns](#103-deployment-patterns)
- [10.4 Monitoring and Analytics](#104-monitoring-and-analytics)

## Document Scope and Purpose

### Scope
This guide covers the complete user journey for the OffScript platform, from initial guest exploration through registered user engagement. It includes technical implementation details, data flows, security considerations, and practical examples for developers and stakeholders.

### Purpose
- **For Developers**: Technical reference for implementing user journey features
- **For Product Managers**: Understanding of user flows and data collection points
- **For QA Teams**: Comprehensive testing scenarios and validation criteria
- **For Security Teams**: Security measures and privacy protection mechanisms
- **For Stakeholders**: Business logic and user experience patterns

### Document Maintenance
This guide should be updated when:
- New user journey features are added
- Database schema changes occur
- Voice interaction patterns are modified
- Security requirements are updated
- API integrations are changed

## Quick Reference

### Key Services
- `GuestSessionService`: Guest session management and localStorage persistence
- `GuestMigrationService`: Guest-to-registered user data migration
- `UnifiedVoiceContextService`: ElevenLabs agent context management
- `DashboardCareerEnhancementService`: Career card enhancement pipeline
- `UserService`: Firebase user data management

### Key Data Flows
1. **Guest Discovery**: Landing → Voice Chat → Career Cards → Conversion
2. **User Registration**: Guest Migration → Firebase Persistence → Enhanced Features
3. **Voice Context**: User Data → Context Injection → Personalized Conversations
4. **Career Enhancement**: Basic Cards → API Enrichment → Validated Persistence

### Critical Security Points
- Guest data isolation in localStorage
- Firebase security rules for user-specific data
- ElevenLabs agent context reset between users
- Data serialization and validation for Firebase
- Migration data verification and rollback capabilities

---

**Version**: 1.0  
**Last Updated**: January 2025  
**Maintained By**: OffScript Development Team

---

*This document provides comprehensive technical and user experience documentation for the OffScript voice-first career exploration platform. For questions or updates, please contact the development team.*
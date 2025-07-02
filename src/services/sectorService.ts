import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

export interface Sector {
  id: string;
  name: string;
  description: string;
  iconUrl?: string;
  imageUrl?: string;
  careers: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Career {
  id: string;
  title: string;
  description: string;
  salaryRange: {
    min: number;
    max: number;
    currency: string;
  };
  educationRequirements: string[];
  skills: string[];
  dayInLife: string;
  growthPotential: string;
  sectorId: string;
  videoUrls?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Convert Firestore data to Sector object
const convertSector = (doc: any): Sector => {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name,
    description: data.description,
    iconUrl: data.iconUrl,
    imageUrl: data.imageUrl,
    careers: data.careers || [],
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt
  };
};

// Convert Firestore data to Career object
const convertCareer = (doc: any): Career => {
  const data = doc.data();
  return {
    id: doc.id,
    title: data.title,
    description: data.description,
    salaryRange: data.salaryRange,
    educationRequirements: data.educationRequirements || [],
    skills: data.skills || [],
    dayInLife: data.dayInLife || '',
    growthPotential: data.growthPotential || '',
    sectorId: data.sectorId,
    videoUrls: data.videoUrls || [],
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt
  };
};

// Get all sectors
export const getAllSectors = async (): Promise<Sector[]> => {
  try {
    const sectorsQuery = query(collection(db, 'sectors'), orderBy('name'));
    const querySnapshot = await getDocs(sectorsQuery);
    
    return querySnapshot.docs.map(convertSector);
  } catch (error) {
    console.error('Error getting sectors:', error);
    throw error;
  }
};

// Get sector by ID
export const getSectorById = async (id: string): Promise<Sector | null> => {
  try {
    const sectorRef = doc(db, 'sectors', id);
    const sectorDoc = await getDoc(sectorRef);
    
    if (!sectorDoc.exists()) {
      return null;
    }
    
    return convertSector(sectorDoc);
  } catch (error) {
    console.error('Error getting sector:', error);
    throw error;
  }
};

// Get careers by sector
export const getCareersBySector = async (sectorId: string): Promise<Career[]> => {
  try {
    const careersQuery = query(
      collection(db, 'careers'),
      where('sectorId', '==', sectorId),
      orderBy('title')
    );
    const querySnapshot = await getDocs(careersQuery);
    
    return querySnapshot.docs.map(convertCareer);
  } catch (error) {
    console.error('Error getting careers by sector:', error);
    throw error;
  }
};

// Get career by ID
export const getCareerById = async (id: string): Promise<Career | null> => {
  try {
    const careerRef = doc(db, 'careers', id);
    const careerDoc = await getDoc(careerRef);
    
    if (!careerDoc.exists()) {
      return null;
    }
    
    return convertCareer(careerDoc);
  } catch (error) {
    console.error('Error getting career:', error);
    throw error;
  }
};

// Search careers by title
export const searchCareers = async (searchTerm: string, maxResults = 10): Promise<Career[]> => {
  try {
    // Note: This is a simple implementation. For production, consider using Firestore's
    // array-contains or array-contains-any operators with keywords, or implement a more
    // sophisticated search solution like Algolia or Elasticsearch.
    const careersQuery = query(
      collection(db, 'careers'),
      orderBy('title'),
      limit(50) // Fetch a reasonable number to search through
    );
    const querySnapshot = await getDocs(careersQuery);
    
    // Client-side filtering (not ideal for large datasets)
    const searchTermLower = searchTerm.toLowerCase();
    const filteredCareers = querySnapshot.docs
      .map(convertCareer)
      .filter(career => 
        career.title.toLowerCase().includes(searchTermLower) ||
        career.description.toLowerCase().includes(searchTermLower)
      )
      .slice(0, maxResults);
    
    return filteredCareers;
  } catch (error) {
    console.error('Error searching careers:', error);
    throw error;
  }
}; 
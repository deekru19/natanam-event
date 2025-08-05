import React, { useState } from 'react';
import { db, storage } from '../firebase/config';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';

const FirebaseTest: React.FC = () => {
  const [testResult, setTestResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testFirestore = async () => {
    setLoading(true);
    setTestResult('Testing Firestore...');
    
    try {
      // Test writing to Firestore
      const testDoc = doc(db, 'test', 'connection-test');
      await setDoc(testDoc, {
        message: 'Firestore connection successful',
        timestamp: new Date().toISOString()
      });
      
      // Test reading from Firestore
      const docSnap = await getDoc(testDoc);
      if (docSnap.exists()) {
        setTestResult('✅ Firestore: Connection successful! Writing and reading works.');
      } else {
        setTestResult('❌ Firestore: Write succeeded but read failed.');
      }
    } catch (error: any) {
      setTestResult(`❌ Firestore Error: ${error.message}`);
      console.error('Firestore error:', error);
    } finally {
      setLoading(false);
    }
  };

  const testStorage = async () => {
    setLoading(true);
    setTestResult('Testing Storage...');
    
    try {
      // Test uploading to Storage
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const storageRef = ref(storage, 'test/test-file.txt');
      await uploadBytes(storageRef, testFile);
      
      setTestResult('✅ Storage: Connection successful! Upload works.');
    } catch (error: any) {
      setTestResult(`❌ Storage Error: ${error.message}`);
      console.error('Storage error:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkEnvironmentVariables = () => {
    const requiredVars = [
      'REACT_APP_FIREBASE_API_KEY',
      'REACT_APP_FIREBASE_AUTH_DOMAIN',
      'REACT_APP_FIREBASE_PROJECT_ID',
      'REACT_APP_FIREBASE_STORAGE_BUCKET',
      'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
      'REACT_APP_FIREBASE_APP_ID'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length === 0) {
      setTestResult('✅ Environment Variables: All Firebase variables are set.');
    } else {
      setTestResult(`❌ Environment Variables: Missing ${missingVars.join(', ')}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Firebase Connection Test</h2>
        
        <div className="space-y-4 mb-6">
          <button
            onClick={checkEnvironmentVariables}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Check Environment Variables
          </button>
          
          <button
            onClick={testFirestore}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            Test Firestore Connection
          </button>
          
          <button
            onClick={testStorage}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            Test Storage Connection
          </button>
        </div>

        {testResult && (
          <div className={`p-4 rounded-lg ${
            testResult.includes('✅') 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <p className={`text-sm ${
              testResult.includes('✅') ? 'text-green-800' : 'text-red-800'
            }`}>
              {testResult}
            </p>
          </div>
        )}

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-medium text-yellow-800 mb-2">Troubleshooting Steps:</h3>
          <ol className="text-sm text-yellow-700 space-y-1">
            <li>1. Check if your <code>.env</code> file exists in the dance-event-app folder</li>
            <li>2. Verify all Firebase environment variables are set correctly</li>
            <li>3. Ensure Firestore Database is enabled in Firebase Console</li>
            <li>4. Ensure Storage is enabled in Firebase Console</li>
            <li>5. Check Firestore and Storage rules allow read/write</li>
            <li>6. Verify your Firebase project ID matches the one in your config</li>
          </ol>
        </div>

        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="font-medium text-gray-800 mb-2">Example .env file:</h3>
          <pre className="text-xs text-gray-600 bg-white p-2 rounded border">
{`REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id`}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default FirebaseTest; 
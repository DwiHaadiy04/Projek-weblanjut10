import React, { useState, useEffect } from 'react';
import UserList from './components/UserList';
import './styles.css';

const App = () => {
  // State management
  const [users, setUsers] = useState([]);
  const [streamUsers, setStreamUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [useWorker, setUseWorker] = useState(true);
  const [sortBy, setSortBy] = useState('name');
  const [minAge, setMinAge] = useState(30);
  const [dataSource, setDataSource] = useState(null);
  const [metrics, setMetrics] = useState({
    promiseAll: 0,
    promiseAllSettled: 0,
    workerTime: 0,
    mainThreadTime: 0
  });

  // Data control settings
  const [dataSettings, setDataSettings] = useState({
    pagesToFetch: 2,     // Default: 2 pages (20 users)
    streamLimit: 15      // Default: 15 streaming users
  });

  // Constants
  const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
  const USERS_PER_PAGE = 10;

  // Cache helpers
  const saveToCache = (key, data) => {
    const cacheData = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(cacheData));
  };

  const getFromCache = (key) => {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(key);
      return null;
    }
    
    return data;
  };

  // Data fetching with quantity control
  const fetchParallelData = async () => {
    setLoading(true);
    
    // Check cache first
    const cachedData = getFromCache('users');
    if (cachedData) {
      setUsers(cachedData);
      setDataSource('cache');
      setLoading(false);
      return;
    }

    try {
      // Prepare page requests
      const pages = Array.from(
        { length: dataSettings.pagesToFetch }, 
        (_, i) => i + 1
      );

      // Using Promise.all()
      const promiseAllStart = performance.now();
      const allResponses = await Promise.all(
        pages.map(page => 
          fetch(`http://localhost:5000/api/users?page=${page}`)
            .then(res => res.json())
        )
      );
      const promiseAllEnd = performance.now();

      // Using Promise.allSettled()
      const promiseSettledStart = performance.now();
      const settledResponses = await Promise.allSettled(
        pages.map(page => 
          fetch(`http://localhost:5000/api/users?page=${page}`)
            .then(res => res.json())
        )
      );
      const promiseSettledEnd = performance.now();

      // Process responses
      const allUsers = allResponses.flat();
      const successfulData = settledResponses
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value)
        .flat();

      // Combine and remove duplicates
      const combinedUsers = [...allUsers, ...successfulData].filter(
  (user, index, self) => index === self.findIndex(u => u.id === user.id)
);

      // Update state
      setUsers(combinedUsers);
      setDataSource('server');
      setMetrics(prev => ({
        ...prev,
        promiseAll: promiseAllEnd - promiseAllStart,
        promiseAllSettled: promiseSettledEnd - promiseSettledStart
      }));
      
      // Save to cache
      saveToCache('users', combinedUsers);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Data processing with Web Worker
  const processWithWorker = () => {
    if (users.length === 0) return;
    
    const worker = new Worker('worker.js');
    
    worker.postMessage({ 
      users, 
      minAge, 
      sortBy 
    });
    
    worker.onmessage = (e) => {
      setUsers(e.data.users);
      setMetrics(prev => ({
        ...prev,
        workerTime: e.data.processingTime
      }));
      worker.terminate();
    };

    worker.onerror = (error) => {
      console.error('Worker error:', error);
      worker.terminate();
    };
  };

  // Data processing in main thread
  const processInMainThread = () => {
    const startTime = performance.now();
    
    const filteredUsers = users.filter(user => user.age > minAge);
    const sortedUsers = [...filteredUsers].sort((a, b) => {
      return sortBy === 'name' 
        ? a.name.localeCompare(b.name) 
        : a.age - b.age;
    });
    
    setUsers(sortedUsers);
    setMetrics(prev => ({
      ...prev,
      mainThreadTime: performance.now() - startTime
    }));
  };

  const handleProcessData = () => {
    if (useWorker) {
      processWithWorker();
    } else {
      processInMainThread();
    }
  };

  // Stream data with controlled quantity
  const streamData = async () => {
    setStreamUsers([]);
    try {
      const response = await fetch('http://localhost:5000/api/users-stream');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      if (!response.body) throw new Error('ReadableStream not supported');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let receivedCount = 0;
      let buffer = '';
      
      while (receivedCount < dataSettings.streamLimit) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        for (const line of lines.slice(0, -1)) {
          if (receivedCount >= dataSettings.streamLimit) break;
          
          try {
            if (line.trim() === '') continue;
            const user = JSON.parse(line);
            if (!user.id || !user.name) throw new Error('Invalid user data');
            
            setStreamUsers(prev => {
              const exists = prev.some(u => u.id === user.id);
              return exists ? prev : [...prev, user];
            });
            receivedCount++;
          } catch (error) {
            console.error('Error parsing chunk:', line, error);
          }
        }
        buffer = lines[lines.length - 1];
      }
    } catch (error) {
      console.error('Streaming failed:', error);
    }
  };

  // Refresh data
  const refreshData = () => {
    localStorage.removeItem('users');
    fetchParallelData();
  };

  // Initial load
  useEffect(() => {
    fetchParallelData();
  }, []);

  return (
    <div className="app">
      <h1>Advanced User Data Explorer</h1>
      
      {/* Controls Section */}
      <div className="controls">
        <div className="control-group">
          <button onClick={fetchParallelData} disabled={loading}>
            Load Parallel Data
          </button>
          <button onClick={refreshData} disabled={loading}>
            Refresh Data
          </button>
          <button onClick={streamData} disabled={loading}>
            Start Streaming
          </button>
        </div>
        
        <div className="control-group">
          <label>
            Min Age:
            <input 
              type="number" 
              value={minAge}
              onChange={(e) => setMinAge(parseInt(e.target.value) || 0)}
              min="18"
              max="100"
            />
          </label>
          
          <label>
            Sort By:
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="name">Name</option>
              <option value="age">Age</option>
            </select>
          </label>
          
          <label className="toggle">
            <input
              type="checkbox"
              checked={useWorker}
              onChange={() => setUseWorker(!useWorker)}
            />
            Use Web Worker
          </label>
          
          <button onClick={handleProcessData} disabled={loading || users.length === 0}>
            Process Data
          </button>
        </div>

        {/* Data Quantity Controls */}
        <div className="control-group">
          <label>
            Pages to Fetch:
            <input 
              type="number"
              value={dataSettings.pagesToFetch}
              min="1"
              max="5"
              onChange={(e) => setDataSettings({
                ...dataSettings,
                pagesToFetch: parseInt(e.target.value) || 1
              })}
            />
            <span>({dataSettings.pagesToFetch * USERS_PER_PAGE} users)</span>
          </label>
          
          <label>
            Stream Limit:
            <input
              type="number"
              value={dataSettings.streamLimit}
              min="1"
              max="30"
              onChange={(e) => setDataSettings({
                ...dataSettings,
                streamLimit: parseInt(e.target.value) || 1
              })}
            />
          </label>
        </div>
      </div>
      
      {/* Metrics Section */}
      <div className="metrics">
        <h2>Performance Metrics</h2>
        <p>Data Source: <strong>{dataSource || 'N/A'}</strong></p>
        <div className="metric-grid">
          <div>
            <h3>Data Loading</h3>
            <p>Promise.all: <strong>{metrics.promiseAll.toFixed(2)} ms</strong></p>
            <p>Promise.allSettled: <strong>{metrics.promiseAllSettled.toFixed(2)} ms</strong></p>
          </div>
          <div>
            <h3>Data Processing</h3>
            <p>Web Worker: <strong>{metrics.workerTime.toFixed(2)} ms</strong></p>
            <p>Main Thread: <strong>{metrics.mainThreadTime.toFixed(2)} ms</strong></p>
          </div>
        </div>
      </div>
      
      {/* Data Display Section */}
      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading data...</p>
        </div>
      ) : (
        <>
          <div className="data-section">
            <h2>Processed Users ({users.length} total, Age > {minAge})</h2>
            <UserList users={users} />
          </div>
          
          {streamUsers.length > 0 && (
            <div className="stream-section">
              <h2>Streamed Users ({streamUsers.length})</h2>
              <UserList users={streamUsers} />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default App;

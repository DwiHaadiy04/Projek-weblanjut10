self.onmessage = function(e) {
    const startTime = performance.now();
    const { users, minAge, sortBy } = e.data;
    
    // Filter users based on the minimum age
    const filteredUsers = users.filter(user => user.age > minAge);
    
    // Sort filtered users based on the sortBy field (either 'name' or 'age')
    const sortedUsers = [...filteredUsers].sort((a, b) => {
      return sortBy === 'name'
        ? a.name.localeCompare(b.name) // Sort alphabetically by name
        : a.age - b.age; // Sort numerically by age
    });
    
    const processingTime = performance.now() - startTime;
    
    // Send the sorted users and processing time back to the main thread
    self.postMessage({
      users: sortedUsers,
      processingTime
    });
  };
  
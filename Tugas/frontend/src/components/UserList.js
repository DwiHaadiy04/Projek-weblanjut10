import React from 'react';

const UserList = ({ users }) => {
  return (
    <div className="user-list">
      {users.map(user => (
        <div key={user.id} className="user-card">
          <h3>{user.name}</h3>
          <p>Age: {user.age}</p>
          <p>Email: {user.email}</p>
          <p>ID: {user.id}</p>
        </div>
      ))}
    </div>
  );
};

export default UserList;
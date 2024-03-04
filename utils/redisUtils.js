// src/utils/redisUtils.js
const redis = require('redis');
const math = require('math');
const { redisConfig } = require('../config');
const client = redis.createClient(redisConfig);

client.on('error', err => {
  console.log('Redis Client Error ', err)
  process.exit(1)
});

client.connect().then(async () => {
  console.log('Successfully connected to Redis server!');

  process.on('SIGINT', () => {
    client.quit()
        .then(() => console.log('Disconnected from Redis server'))
        .catch(err => console.error('Error disconnecting from Redis: ', err));
  });
}).catch(err => {
  console.error('Error connecting to Redis:', err);
  process.exit(1);
});

async function saveMessageToRedis(roomName, message) {
  console.log("--------A message landed for Redis --------- ");
  const key = `room_name_${roomName}`;
  try {

    // Push the new message to the list
    const res1 = await client.lPush(key, JSON.stringify(message));
    if (res1 === 0) {
      console.log("Could not set data to redis")
    } else {
      console.log("Set data to redis under key ", key)
    }

  } catch (error) {
    console.error("Error saving message to Redis:", error);
  }
}
async function cacheRecentMessages(roomName, messages) {
  const messageData = messages.map((message) => JSON.stringify(message));
  const key = `room_name_${roomName}`;
  try {
    for (const message of messageData) {
      // Push the new message to the list
      const res1 = await client.rPush(key, message);
      if (res1 === 0) {
        console.log("Could not set data to redis")
      } else {
        console.log("Set data to redis")
      }
    }
  } catch (error) {
    console.error('Error caching messages:', error);
  }
}

async function getRecentMessages(roomName, count) {
  const key = `room_name_${roomName}`;
  const listLength = await client.lLen(key);
  let limit = math.min(listLength, count-1)
  const messages = await client.lRange(key, 0, limit);
  return messages.map((message) => JSON.parse(message));
}

const setUserActive = async (socketId, roomName, userMail) => {
  // set to redis, make active/delete
  console.log("User Status update attempt to redis. ", socketId, roomName, userMail);
  const fieldsAdded = await client.hSet(
      socketId,
      {
        roomName: roomName,
        userMail: userMail,
      },
  ).then( (fieldsAdded) => {
    console.log("User Status updated to redis. ", fieldsAdded);
  }).catch(err => {
    console.log("Error occurred ", err)
  })
  await AddOnlineUsers(roomName, userMail)
}

const setUserOffline = async (socketId) => {
  // set to redis, make active/delete
  const {roomName, userMail} = await client.hGetAll(socketId);
  console.log(userMail, roomName)
  try {
    await DeleteOnlineUsers(roomName, userMail)
    await client.DEL(socketId)
    console.log("User sent to offline status")
    // Return user information as an object
    return { "userMail": userMail, "roomName": roomName };
  } catch (e) {
    console.log("Error occurred ", e)
  }
}

const getOnlineUsers = async (roomName) => {
  let key = `${roomName}_online_members`
  try {
    // Push the new member to the online users set
    const onlineMembers = await client.sMembers(key);
    if (onlineMembers.length === 0) {
      console.log("no online members")
    } else {
      console.log("retrieved online members : ", onlineMembers)
      return onlineMembers
    }

  } catch (error) {
    console.error("Error saving message to Redis:", error);
  }
}

const AddOnlineUsers = async (roomName, memberEmail) => {
  let key = `${roomName}_online_members`
  try {
    // Push the new member to the online users set
    const res1 = await client.sAdd(key, memberEmail);
    if (res1 === 0) {
      console.log("Could not set data to redis")
    } else {
      console.log("Set data to redis under key ", key)
    }

  } catch (error) {
    console.error("Error saving message to Redis:", error);
  }
}

const DeleteOnlineUsers = async (roomName, memberEmail) => {
  let key = `${roomName}_online_members`
  try {
    // Push the new member to the online users set
    const res1 = await client.sRem(key, memberEmail);
    if (res1 === 0) {
      console.log("Could not delete data from redis")
    } else {
      console.log("removed data from redis ", key)
    }

  } catch (error) {
    console.error("Error saving message to Redis:", error);
  }
}

// const SetUserOfflineCode = async () => {
//   await client.exists(key, async (err, reply) => {
//     if (reply === 1) { // Key is in redis
//       if (online) { // status should be online
//         console.log('exists');
//       } else { // status should be offline, so we delete the key
//         await client.del(key, function(err, response) {
//           if (response === 1) {
//             console.log("Deleted Successfully!")
//           } else{
//             console.log("Cannot delete")
//           }
//         })
//       }
//     } else { // Key Is not in redis
//       if (online) { // status should be online
//         await client.set(key, function(err, response) {
//           if (response === 1) {
//             console.log("set redis data successfully")
//           } else{
//             console.log("Cannot set redis data")
//           }
//         })
//       } else {
//         console.log('user is not online')
//       }
//     }
//   });
// }

module.exports = { saveMessageToRedis, getRecentMessages, cacheRecentMessages, getOnlineUsers, setUserActive, setUserOffline };

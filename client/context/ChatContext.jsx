/** @format */

import { createContext, useState, useContext, useEffect } from "react";
import { AuthContext } from "./AuthContext";
import toast from "react-hot-toast";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [unseenMessages, setUnseenMessages] = useState({});

  // ✅ also bring authUser
  const { socket, axios, authUser } = useContext(AuthContext);

  // function to get all users for sidebar
  const getUser = async () => {
    try {
      const { data } = await axios.get("/api/messages/users");
      if (data.success) {
        // ✅ exclude current logged in user
        const filtered = data.users.filter((u) => u._id !== authUser?._id);
        setUsers(filtered);
        setUnseenMessages(data.unseenMessages || {});
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // function to get messages for selected user
  const getMessages = async (userId) => {
    try {
      const { data } = await axios.get(`/api/messages/${userId}`);
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // send message
  const sendMessage = async (messageData) => {
    try {
      if (!selectedUser) {
        toast.error("Select a user to send message");
        return;
      }
      const { data } = await axios.post(
        `/api/messages/send/${selectedUser._id}`,
        messageData
      );
      if (data.success) {
        setMessages((prevMessages) => [...prevMessages, data.newMessage]);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // subscribe to new messages via socket
  const subscribeToMessages = () => {
    if (!socket) return;

    socket.on("newMessage", (newMessage) => {
      if (selectedUser && newMessage.senderId === selectedUser._id) {
        newMessage.seen = true;
        setMessages((prevMessages) => [...prevMessages, newMessage]);
        axios.put(`/api/messages/mark/${newMessage._id}`);
      } else {
        setUnseenMessages((prevUnseen) => ({
          ...prevUnseen,
          [newMessage.senderId]: prevUnseen[newMessage.senderId]
            ? prevUnseen[newMessage.senderId] + 1
            : 1,
        }));
      }
    });
  };

  const unsubscribeFromMessages = () => {
    if (!socket) return;
    socket.off("newMessage");
  };

  // listen to socket changes
  useEffect(() => {
    subscribeToMessages();
    return () => unsubscribeFromMessages();
  }, [socket, selectedUser]);

  // ✅ fetch users when authUser changes (login/logout)
  useEffect(() => {
    if (authUser) {
      getUser();
    } else {
      setUsers([]); // clear users on logout
      setMessages([]);
      setSelectedUser(null);
      setUnseenMessages({});
    }
  }, [authUser]);

  const value = {
    messages,
    users,
    selectedUser,
    getUser,
    getMessages,
    setSelectedUser,
    sendMessage,
    unseenMessages,
    setUnseenMessages,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

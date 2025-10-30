"use client";
import { useAuth, useUser } from "@clerk/nextjs";
import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios"; // ✅ Added import
import toast from "react-hot-toast";

export const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

export const AppContextProvider = ({ children }) => {
  const { user } = useUser();
  const { getToken } = useAuth();

  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);

  const createNewChat = async () => {
    try {
      if (!user) return null;
      const token = await getToken();

      await axios.post(
        "/api/chat/create",
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      await fetchUsersChats(); // ✅ wait for fetch to complete
    } catch (error) {
      console.error("Create Chat Error:", error);
      toast.error(error.message || "Failed to create chat");
    }
  };

  const fetchUsersChats = async () => {
    try {
      const token = await getToken();

      const { data } = await axios.get("/api/chat/get", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (data.success) {
        const chatsList = data.data || [];
        console.log("Fetched Chats:", chatsList);

        if (chatsList.length === 0) {
          await createNewChat();
          return;
        }

        // ✅ Sort by latest updatedAt
        chatsList.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        setChats(chatsList);
        setSelectedChat(chatsList[0]);
        console.log("Selected Chat:", chatsList[0]);
      } else {
        toast.error(data.message || "Failed to fetch chats");
      }
    } catch (error) {
      console.error("Fetch Chats Error:", error);
      toast.error(error.message || "Error fetching chats");
    }
  };

  useEffect(() => {
    if (user) {
      fetchUsersChats();
    }
  }, [user]);

  const value = {
    user,
    chats,
    setChats,
    selectedChat,
    setSelectedChat,
    fetchUsersChats,
    createNewChat,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

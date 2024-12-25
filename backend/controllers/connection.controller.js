import ConnectionRequest from "../models/connectionRequest.model.js";
import { sendConnectionAcceptedEmail } from "../mailController/email.js";
import User from "../models/user.model.js";
import { json } from "express";


// Send a connection request to make connection to others by logged user
export const sendConnectionRequest = async (req, res) => {
  try {
    const { userId } = req.params;
    const senderId = req.user._id;

    if (senderId.toString() === userId.toString()) {
      return res
        .status(400)
        .json({ message: "You cannot send a connection request to yourself" });
    }

    if (req.user.connections.includes(userId)) {
      return res
        .status(400)
        .json({ message: "You are already connected with this user" });
    }

    const existingRequest = await ConnectionRequest.findOne({
      sender: senderId,
      receiver: userId,
      status: "pending",
    });

    if (existingRequest) {
      return res
        .status(400)
        .json({ message: "A connection request already exists" });
    }

    const newRequest = new ConnectionRequest({
      sender: senderId,
      receiver: userId,
    });

    await newRequest.save();
    res.status(201).json({ message: "Connection request sent successfully" });
  } catch (error) {
    console.error("Error in sendConnectionRequest controller:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Accept connection request send by other users
export const acceptConnectionRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id;

    const request = await ConnectionRequest.findById(requestId)
      .populate("sender", "name username profilePic")
      .populate("recipient", "name username");

    if (!request) {
      return res.status(404).json({ message: "Connection request not found" });
    }

    //check if the request is for the current user
    if (request.receiver.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "You are not authorized to accept this connection request",
      });
    }

    if (request.status !== "pending") {
      return res
        .status(400)
        .json({ message: "This request has already been processed" });
    }

    request.status = "accepted";
    await request.save();

    //if i am your friend then u are also my friend
    await User.findByIdAndUpdate(request.sender._id, {
      $addToSet: {
        connections: request.receiver,
      },
    });

    await User.findByIdAndUpdate(userId, {
      $addToSet: {
        connections: request.sender._id,
      },
    });

    //create a notification
    const newNotification = new Notification({
      recipient: request.sender._id,
      type: "connectionAccepted",
      relatedUser: userId,
    });

    await newNotification.save();

    res
      .status(200)
      .json({ message: "Connection request accepted successfully" });

    //Send email
    try {
      const senderEmail = request.sender.email;
      const senderName = request.sender.name;
      const recipientName = request.recipient.name;
      const profileUrl =
        process.env.CLIENT_URL + "/profile/" + request.recipient.username;

      try {
        await sendConnectionAcceptedEmail(
          senderEmail,
          senderName,
          recipientName,
          profileUrl
        );
      } catch (error) {
        console.error("Error in sending email:", error);
      }
    } catch (error) {
      console.error("Error in sending email:", error);
    }
  } catch (error) {
    console.error("Error in acceptConnectionRequest controller:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Reject a connection request send  by other users
export const rejectConnectionRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id;

    const request = await ConnectionRequest.findById(requestId);

    if (request.recipient.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to reject this request" });
    }

    if (request.status !== "pending") {
      return res
        .status(403)
        .json({ message: "This request has already been processed" });
    }

    request.status = "rejected";
    await request.save();

    res.json({ message: "Connection request rejected successfully" });
  } catch (error) {
    console.error("Error in rejectConnectionRequest controller:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get the connectios request send by users
export const getConnectionRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    const request = await ConnectionRequest.find({
      recipient: userId,
      status: "pending",
    }).populate("sender", "name username profilePic headline connections");

    res.json(request);
  } catch (error) {
    console.error("Error in getConnectionRequests controller:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get the connectios list send by users
export const getUserConnections = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).populate(
      "connections",
      "name username profilePic headline connections"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" }); //
    }

    res.json(user.connections);
  } catch (error) {
    console.error("Error in getUserConnections controller:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Remove connection between users
export const removeConnection = async (req, res) => {
  try {
    const myId = req.user._id;
    const { userId } = req.params;

    await User.findByIdAndUpdate(myId, { $pull: { connections: userId } });
    await User.findByIdAndUpdate(userId, { $pull: { connections: myId } });

    res.json({ message: "Connection removed successfully" });
  } catch (error) {
    console.error("Error in removeConnection controller:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get connection status between users
export const getConnectionStatus = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user._id;

    const currentUser = req.user;
    if (currentUser.connections.includes(targetUserId)) {
      return res.json({ status: "connected" });
    }

    const pendingRequest = await ConnectionRequest.findOne({
      $or: [
        { sender: currentUserId, recipient: targetUserId },
        { sender: targetUserId, recipient: currentUserId },
      ],
      status: "pending",
    });

    if (pendingRequest) {
      if (pendingRequest.sender.toString() === currentUserId.toString()) {
        return res.json({ status: "pending" });
      } else {
        return res.json({ status: "received", requestId: pendingRequest._id });
      }
    }

    //if no connection or pending req found
    res.json({ status: "notConnected" });
  } catch (error) {
    console.error("Error in getConnectionStatus controller:", error);
    res.status(500).json({ message: "Server error" });
  }
};

import Post from "../models/post.model.js";
import cloudinary from "cloudinary";
import Notification from "../models/notification.model.js";
import { sendCommentNotificationEmail } from "../mailController/email.js";

// Fetch feed posts for the user
export const getFeedPosts = async (req, res) => {
  try {
    const posts = await Post.find({ author: { $in: req.user.connections } })
      .populate("author", "name username profilePic headline")
      .populate("comments.user", "name profilePic")
      .sort({ createdAt: -1 });

    res.status(200).json(posts);
  } catch (error) {
    console.error("Error in getFeedPosts controller:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Create a new post
export const createPost = async (req, res) => {
  try {
    const { content, image } = req.body;

    let newPost;
    if (image) {
      const imgResult = await cloudinary.uploader.upload(image, {
        folder: "posts",
      });
      newPost = new Post({
        author: req.user._id,
        content,
        image: imgResult.secure_url,
        imagePublicId: imgResult.public_id, // Save the public_id for deletion later and optional
      });
    } else {
      newPost = new Post({
        author: req.user._id,
        content,
      });
    }

    await newPost.save();
    res.status(201).json(newPost);
  } catch (error) {
    console.error("Error in createPost controller:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Delete a post
export const deletePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    // Check if the post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if the current user is the author of the post
    if (post.author.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this post" });
    }

    // Delete the image from Cloudinary if it exists
    if (post.imagePublicId) {
      try {
        //await cloudinary.uploader.destroy(post.image.split("/").pop().split(".")[0]);
        const result = await cloudinary.uploader.destroy(post.imagePublicId);
        console.log("Cloudinary Deletion Result:", result);
      } catch (cloudinaryError) {
        console.error("Error deleting image from Cloudinary:", cloudinaryError);
        return res.status(500).json({ message: "Failed to delete image" });
      }
    }

    // Delete the post
    await Post.findByIdAndDelete(postId);
    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error in deletePost controller:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get post by id
export const getPostById = async (req, res) => {
  try {
    const postId = req.params.id;

    // Find the post by ID
    const post = await Post.findById(postId)
      .populate("author", "name username profilePic headline")
      .populate("comments.user", "name profilePic username headline");

    // Check if the post exists
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Return the post
    res.status(200).json(post);
  } catch (error) {
    console.error("Error in getPostById controller:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Post comment
export const createComment = async (req, res) => {
  try {
    const postId = req.params.id;
    const { content } = req.body;

    // Validate content
    if (!content || content.trim() === "") {
      return res
        .status(400)
        .json({ message: "Comment content cannot be empty" });
    }

    // Check if the post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Add the comment to the post
    const newComment = await Post.findByIdAndUpdate(
      postId,
      {
        $push: {
          comments: {
            user: req.user._id,
            content,
          },
        },
      },
      { new: true }
    ).populate("author", "name email username headline profilePic");

    // Create a notification for the post author
    if (post.author.toString() !== req.user._id.toString()) {
      const newNotification = new Notification({
        recipient: post.author,
        type: "comment",
        relatedUser: req.user._id,
        relatedPost: postId,
      });

      try {
        await newNotification.save();
      } catch (notificationError) {
        console.error(
          "Error creating notification:",
          notificationError.message
        );
      }

      // Send an email notification to the post author
      try {
        const postUrl = `${process.env.CLIENT_URL}/post/${postId}`;
        await sendCommentNotificationEmail(
          post.author.email,
          post.author.name,
          req.user.name,
          postUrl,
          content
        );
      } catch (emailError) {
        console.error(
          "Error sending comment notification email:",
          emailError.message
        );
      }
    }

    res.status(200).json(newComment);
  } catch (error) {
    console.error("Error in createComment controller:", error);
    res.status(500).json({ message: "Server error" });
  }
};

//Like the post
export const likePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await Post.findById(postId);
    const userId = req.user._id;

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.likes.includes(userId)) {
      //ullike the post
      post.likes = post.likes.filter(
        (id) => id.toString() !== userId.toString()
      );

    } else {
      //like the post
      post.likes.push(userId);
      
      //create a notification if the post owner is not the user who liked the post
      const newNotification = new Notification({
        recipient: post.author,
        type: "like",
        relatedUser: userId,
        relatedPost: postId,
      });

      newNotification.save();
    }

    await post.save();

  } catch (error) {
    console.error("Error in likePost controller:", error);
    res.status(500).json({ message: "Server error" });
  }
};

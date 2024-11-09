const blogsRouter = require("express").Router();
const mongoose = require("mongoose");
const Blog = require("../models/blog");
const User = require("../models/user");
const jwt = require("jsonwebtoken");

// Get all blogs
blogsRouter.get("/", async (request, response) => {
  const blogs = await Blog.find({}).populate("user", {
    username: 1,
    name: 1,
    id: 1,
  });
  return response.json(blogs);
});

// Add a new blog
blogsRouter.post("/", async (request, response) => {
  let blog = request.body;
  const token = request.token;

  const decodedToken = jwt.verify(token, process.env.SECRET);

  // Check if the decoded token contains an id property, as it should
  if (!decodedToken.id) {
    return response.status(401).json({ error: "Invalid token" });
  }

  if (!blog.title || !blog.url) {
    return response.status(400).end();
  }

  if (!blog.hasOwnProperty("likes")) {
    blog.likes = 0;
  }

  // If everything is valid, then create blog

  // Get user from database
  const user = await User.findById(decodedToken.id);

  // Assign user id to blog
  blog.user = user.id;

  const blogMongoose = new Blog(blog);

  savedBlog = await blogMongoose.save();

  // Add blog id to user's blogs array
  user.blogs = user.blogs.concat(savedBlog.id);

  savedUser = await user.save();

  return response.status(201).json(savedBlog);
});

// Update a blog post by id
blogsRouter.put("/:id", async (request, response) => {
  // Get data from the request
  const blogId = request.params.id;
  const body = request.body;
  const blog = {
    title: body.title,
    author: body.author,
    url: body.url,
    likes: body.likes,
  };

  // Process data
  const updatedBlog = await Blog.findByIdAndUpdate(blogId, blog, { new: true });

  if (!updatedBlog) {
    return response.status(404).json({ error: "Object not found." });
  }

  // Send response
  return response.json(updatedBlog);
});

// Delete a blog by id
blogsRouter.delete("/:id", async (request, response) => {
  // Get data from the request
  const blogId = request.params.id;
  const token = request.token;

  // Decode the token
  const decodedToken = jwt.verify(token, process.env.SECRET);

  if (!mongoose.Types.ObjectId.isValid(blogId)) {
    return response.status(400).json({ error: "Bad request: invalid id" });
  }

  if (!decodedToken.id) {
    return response.status(401).json({ error: "Unauthorized: Invalid token." });
  }

  // Find the blog
  const blog = await Blog.findById(blogId);

  if (blog.user.toString() !== decodedToken.id) {
    return response
      .status(401)
      .json({ error: "Unauthorized: cannot delete a blog that is not yours." });
  }

  const result = await blog.deleteOne();

  // Return response
  return response.status(204).end();
});

module.exports = blogsRouter;

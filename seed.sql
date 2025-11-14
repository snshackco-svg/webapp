-- Seed data for development testing
-- This data is for local development only

-- Insert test users
INSERT OR IGNORE INTO users (id, email, name) VALUES 
  (1, 'alice@example.com', 'Alice Johnson'),
  (2, 'bob@example.com', 'Bob Smith'),
  (3, 'charlie@example.com', 'Charlie Brown');

-- Insert test posts
INSERT OR IGNORE INTO posts (title, content, user_id) VALUES 
  ('Welcome to Our Platform', 'This is our first post. Welcome everyone!', 1),
  ('Getting Started Guide', 'Here is a comprehensive guide to get started...', 1),
  ('My First Post', 'Hello world! This is my first blog post.', 2),
  ('Amazing Features', 'Check out these amazing features we have built.', 3);

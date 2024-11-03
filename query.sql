------------------------------- PRODUCTS TABLE -------------------------------

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    company_name TEXT,
    production_location TEXT,
    actual_price DECIMAL(10, 2) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    discount_percent INTEGER NOT NULL,
    description TEXT,
    image_url TEXT,
    category VARCHAR(100),
    eco_friendly INT DEFAULT 0 CHECK (eco_friendly IN (0, 1, 2)),    -- 0: not eco-friendly, 1: eco-friendly, 2: highly eco-friendly
    recycled INT DEFAULT 0 CHECK (recycled IN (0, 1, 2)),
    locally_sourced INT DEFAULT 0 CHECK (locally_sourced IN (0, 1, 2)),
    rating DECIMAL(3, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


------------------------------- USER TABLE -------------------------------

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    mobile_number NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    address TEXT NOT NULL,
    pincode INT NOT NULL,
    total_purchases INT DEFAULT 0,
    total_follower INT DEFAULT 0,
    total_following INT DEFAULT 0,
    eco_purchases INT DEFAULT 0,
    recycled_purchases INT DEFAULT 0,
    locally_sourced_purchases INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


------------------------------- REVIEW TABLE -------------------------------

CREATE TABLE review (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    comment TEXT,
    review_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


------------------------------- CART TABLE -------------------------------

CREATE TABLE cart (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE
);


------------------------------- ADMINS TABLE -------------------------------

CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,  -- Store the hashed password
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


------------------------------- USERS_POST TABLE -------------------------------

CREATE TABLE user_posts (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE CASCADE, -- Optional link to a product
    post_text TEXT NOT NULL,
    image_url TEXT,
    likes_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


------------------------------- POST_LIKES TABLE -------------------------------

CREATE TABLE post_likes (
    id SERIAL PRIMARY KEY,
    post_id INT REFERENCES user_posts(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    liked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


------------------------------- POST_COMMENTS TABLE -------------------------------

CREATE TABLE post_comments (
    id SERIAL PRIMARY KEY,
    post_id INT REFERENCES user_posts(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    commented_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


------------------------------- USER_FOLLOWS TABLE -------------------------------

CREATE TABLE user_follows (
    follower_id INT REFERENCES users(id) ON DELETE CASCADE,
    followee_id INT REFERENCES users(id) ON DELETE CASCADE,
    followed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, followee_id)
);

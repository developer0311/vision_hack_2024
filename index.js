import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import { dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import session from "express-session";
import flash from "express-flash";
import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import path from "path";
import fs from "fs";

const app = express();
const port = process.env.SERVER_PORT;
const __dirname = dirname(fileURLToPath(import.meta.url));
const saltRounds = 10;
const admin_password = process.env.ADMIN_PASSWORD;
const auth_cb_url = process.env.GOOGLE_CB_URL;
let home_active = "my-active";
let cart_active = "";
let social_active = "";
let favicon = "/images/eco_favicon.png";

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

app.set("view engine", "ejs"); // Set view engine

const db = new pg.Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});
db.connect();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer Configuration to handle file uploads
const storage = multer.diskStorage({
  destination: "uploads/", // Temporary folder to store files before Cloudinary upload
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

let deleteFile = (filePath) => {
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error(`Error deleting file: ${filePath}`, err);
    } else {
      console.log(`File deleted: ${filePath}`);
    }
  });
};

// ------------------------------------------------------- FUNCTIONS -------------------------------------------------------//

let get_username = (email) => {
  let username = email.split("@")[0];
  return username;
};

let active_page = (pageName) => {
  if (pageName == "home") {
    home_active = "my-active";
    cart_active = "";
    social_active = "";
  } else if (pageName == "cart") {
    home_active = "";
    cart_active = "my-active";
    social_active = "";
  } else if (pageName == "social") {
    home_active = "";
    cart_active = "";
    social_active = "my-active";
  }
};

// Cloudinary upload and transformation function
let handleCloudinaryProfileImageUpload = async (filePath, fileName) => {
  try {
    // Set the public ID to include the destination folder
    const publicId = `${fileName}`;
    const folderPath = "eco_e-com_social/profile_images";

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(filePath, {
      public_id: publicId,
      folder: folderPath,
    });

    // Optimize the image (fetch_format and quality auto)
    const optimizeUrl = cloudinary.url(publicId, {
      fetch_format: "auto",
      quality: "auto",
    });

    // Auto-crop the image
    const autoCropUrl = cloudinary.url(publicId, {
      crop: "crop",
      gravity: "center",
      width: 500, // Set width (same as height for square crop)
      height: 500,
    });

    return {
      uploadResult,
      optimizeUrl,
      autoCropUrl,
    };
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    throw error;
  }
};

let handleCloudinaryImageDelete = async (public_id) => {
  cloudinary.uploader
    .destroy([public_id], { type: "upload", resource_type: "image" })
    .then((result) => console.log(result));
};

//-------------------------- SEARCH Routes --------------------------//

app.get("/search", async (req, res) => {
  const searchQuery = req.query.query; // Get the search term from the query string

  try {
    if (!searchQuery) {
      return res.status(400).send("Search query is required");
    }
    const result = await db.query(
      "SELECT * FROM products WHERE name ILIKE $1",
      [`%${searchQuery}%`]
    );
    res.render("searchResults", { products: result.rows, query: searchQuery });
  } catch (error) {
    console.error("Error executing query", error.stack);
    res.status(500).send("Internal Server Error");
  }
});

//-------------------------- INDEX Routes --------------------------//

app.get("/", (req, res) => {
  const username = req.isAuthenticated()
    ? get_username(req.user.email)
    : "Guest";
  let profileImageUrl = req.isAuthenticated()
    ? req.user.profile_image_url
    : favicon;
  res.render(__dirname + "/views/home.ejs", {
    profile_name: username,
    homeActive: home_active,
    cartActive: cart_active,
    socialActive: social_active,
    profileImageUrl: profileImageUrl,
  }); // Render the home view
});

//-------------------------- INDEX Routes --------------------------//

app.get(
  "/auth/google/home",
  passport.authenticate("google", {
    successRedirect: "/home",
    failureRedirect: "/login",
  })
);

app.get("/home", async (req, res) => {
  active_page("home");
  if (req.isAuthenticated()) {
    try {
      const user = req.user;
      let username = get_username(user.email);
      let profileImageUrl = req.user.profile_image_url;
      const e_result = await db.query(
        "SELECT * FROM products WHERE category = $1",
        ["electronics"]
      );
      const m_result = await db.query(
        "SELECT * FROM products WHERE category = $1",
        ["mens clothing"]
      );
      const w_result = await db.query(
        "SELECT * FROM products WHERE category = $1",
        ["womens clothing"]
      );

      res.render(__dirname + "/views/index.ejs", {
        electronics: e_result.rows,
        mensWear: m_result.rows,
        womensWear: w_result.rows,
        profile_name: username || "Guest",
        homeActive: home_active,
        cartActive: cart_active,
        socialActive: social_active,
        profileImageUrl: profileImageUrl,
      });
    } catch (err) {
      console.log(err);
    }
  } else {
    res.redirect("/login");
  }
});

//-------------------------- SPECIFIC ITEMS Routes --------------------------//

app.get("/specific", async (req, res) => {
  active_page("home");
  try {
    const productId = parseInt(req.query.id);
    if (isNaN(productId)) {
      return res.status(400).send("Invalid product ID");
    }

    const result = await db.query("SELECT * FROM products WHERE id = $1", [
      productId,
    ]);
    const product = result.rows[0];

    if (product) {
      let user = req.user;
      let username = get_username(user.email);
      let profileImageUrl = req.user.profile_image_url;
      // console.log(username)
      res.render(__dirname + "/views/specific.ejs", {
        product: product,
        profile_name: username,
        homeActive: home_active,
        cartActive: cart_active,
        socialActive: social_active,
        profileImageUrl: profileImageUrl,
      });
    } else {
      res.status(404).send("Product not found");
    }
  } catch (err) {
    console.error("Database query error:", err);
    res.status(500).send("Server error");
  }
});

//-------------------------- CART Routes --------------------------//

app.get("/cart", async (req, res) => {
  active_page("cart");
  if (req.isAuthenticated()) {
    try {
      const userId = req.user.id; // Get the authenticated user's ID
      let profileImageUrl = req.user.profile_image_url;
      const cartItemsResult = await db.query(
        `SELECT cart.id AS cart_id, cart.user_id, cart.product_id, products.name, products.price, products.image_url
         FROM cart 
         JOIN products ON cart.product_id = products.id 
         WHERE cart.user_id = $1`,
        [userId]
      );

      const cartItems = cartItemsResult.rows;
      const totalPrice = cartItems.reduce((total, item) => {
        return total + parseFloat(item.price); // Convert price to float before adding
      }, 0);

      const username = get_username(req.user.email); // Get the username
      res.render(__dirname + "/views/cart.ejs", {
        cartItems: cartItems || [],
        totalPrice,
        profile_name: username || "Guest", // Ensure username is defined here
        homeActive: home_active,
        cartActive: cart_active,
        profileImageUrl: profileImageUrl,
        socialActive: social_active,
      });
    } catch (err) {
      console.error("Error fetching cart items:", err);
      res.status(500).send("Server error");
    }
  } else {
    res.redirect("/login"); // Redirect to login if not authenticated
  }
});

app.get("/cart/add", async (req, res) => {
  const userId = req.user.id;
  const productId = parseInt(req.query.productId);

  try {
    const existingItem = await db.query(
      "SELECT * FROM cart WHERE user_id = $1 AND product_id = $2",
      [userId, productId]
    );
    if (existingItem.rows.length > 0) {
      return res.status(400).send("Product already in cart");
    }
    await db.query("INSERT INTO cart (product_id, user_id) VALUES ($1, $2)", [
      productId,
      userId,
    ]);
    res.redirect("/cart");
  } catch (err) {
    console.error("Error adding product to cart:", err);
    res.status(500).send("Server error");
  }
});

app.post("/cart/remove", async (req, res) => {
  const itemId = parseInt(req.body.cartId); // Convert cartId to an integer

  if (isNaN(itemId)) {
    return res.status(400).send("Invalid cart ID");
  }

  try {
    await db.query("DELETE FROM cart WHERE id = $1", [itemId]);
    res.redirect("/cart");
  } catch (err) {
    console.error("Error removing item from cart:", err);
    res.status(500).send("Server error");
  }
});

app.post("/cart/checkout", async (req, res) => {
  const userId = req.user.id; // Get the user ID from the authenticated user

  try {
    await db.query("DELETE FROM cart WHERE user_id = $1", [userId]);
    res.redirect("/cart");
  } catch (err) {
    console.error("Error during checkout:", err);
    res.status(500).send("Server error");
  }
});

//-------------------------- SOCIAL Routes --------------------------//

app.get("/social", async (req, res) => {
  active_page("social");
  const username = req.isAuthenticated()
    ? get_username(req.user.email)
    : "Guest"; // Check if the user is authenticated
  let profileImageUrl = req.isAuthenticated()? req.user.profile_image_url: favicon;
  res.render(__dirname + "/views/social.ejs", {
    profile_name: username,
    homeActive: home_active,
    cartActive: cart_active,
    profileImageUrl: profileImageUrl,
    socialActive: social_active,
  });
});

app.get("/post-edit", async (req, res) => {
  active_page("social");

  const username = req.isAuthenticated()
    ? get_username(req.user.email)
    : "Guest";
  let profileImageUrl = user.profileImageUrl;
  const action = req.query.action;
  const productId = req.query.productId;
  let product = null;

  // Check if action is "share" and get product details if necessary
  if (action === "share" && productId) {
    let result = await db.query("SELECT * FROM products WHERE id = $1", [
      productId,
    ]); // Fetch product details by ID
    product = result.rows[0];
  }

  res.render(__dirname + "/views/post_edit.ejs", {
    profile_name: username,
    homeActive: home_active,
    cartActive: cart_active,
    profileImageUrl: profileImageUrl,
    socialActive: social_active,
    product, // Pass product data if available
    action,
  });
});

app.post("/share-post", async (req, res) => {
  active_page("social");
  const username = req.isAuthenticated()
    ? get_username(req.user.email)
    : "Guest";
  let profileImageUrl = req.user.profile_image_url;
  const productId = req.body.productId;
  const postImage = req.body.post_image; // Image URL when sharing existing product image
  const postContent = req.body["post-content"]; // Post text content
  console.log(productId, postImage, postContent);
});

//-------------------------- LOGIN Route --------------------------//

app.get("/login", (req, res) => {
  const username = req.isAuthenticated()
    ? get_username(req.user.email)
    : "Guest"; // Check if user is authenticated

  let profileImageUrl = req.isAuthenticated()
    ? req.user.profile_image_url
    : favicon;
  active_page("home");
  res.render(__dirname + "/views/login.ejs", {
    profile_name: username,
    homeActive: home_active,
    cartActive: cart_active,
    socialActive: social_active,
    profileImageUrl: profileImageUrl,
  });
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/home",
    failureRedirect: "/login",
  })
);

//-------------------------- REGISTER Route --------------------------//

app.get("/register", (req, res) => {
  active_page("home");
  const username = req.isAuthenticated()
    ? get_username(req.user.email)
    : "Guest"; // Check if user is authenticated

  let profileImageUrl = req.isAuthenticated()
    ? req.user.profile_image_url
    : favicon;
  res.render(__dirname + "/views/register.ejs", {
    profile_name: username,
    homeActive: home_active,
    cartActive: cart_active,
    socialActive: social_active,
    profileImageUrl: profileImageUrl,
  });
});

app.post(
  "/register",
  upload.fields([{ name: "profile_photo", maxCount: 1 }]), // Adjusted to match the input name in the form
  async (req, res) => {
    active_page("home");
    const { email, password, username, mobile_number, address, pincode } =
      req.body;

    try {
      // Check if the email or username already exists
      const checkResult = await db.query(
        "SELECT * FROM users WHERE email = $1 OR username = $2",
        [email, username]
      );

      // Determine the error type
      if (checkResult.rows.length > 0) {
        let errorMessage;
        if (checkResult.rows.some((user) => user.username === username)) {
          errorMessage = "Username must be unique.";
        } else {
          errorMessage = "Email is already registered.";
        }
        return res.render("register", {
          errorMessage: errorMessage,
          profile_name: username,
          homeActive: home_active,
          cartActive: cart_active,
          socialActive: social_active,
        });
      }

      // Upload profile image to Cloudinary using the provided function
      const profileImage = req.files["profile_photo"][0]; // Updated to match the input name in the form
      let profileImageUrl = null;

      const coverImageUploadResult = await handleCloudinaryProfileImageUpload(
        path.resolve(profileImage.path),
        path.basename(username, path.extname(username))
      );

      // Delete local files after successful upload
      deleteFile(path.resolve(profileImage.path));

      // Hash the password and save user details in the database
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
          return res.status(500).send("Internal Server Error");
        } else {
          const result = await db.query(
            `INSERT INTO users (username, public_id, profile_image_url, password, mobile_number, email, address, pincode) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [
              username,
              coverImageUploadResult.uploadResult.public_id,
              coverImageUploadResult.uploadResult.secure_url, // Store Cloudinary URL for the image
              hash,
              mobile_number,
              email,
              address,
              pincode,
            ]
          );
          const user = result.rows[0];

          // Log in the user after successful registration
          req.login(user, (err) => {
            if (err) {
              console.error("Login error:", err);
              return res.status(500).send("Internal Server Error");
            }
            console.log("Registration successful, user logged in.");
            res.redirect("/home");
          });

          console.log("Done with registration processing.");
        }
      });
    } catch (err) {
      console.error("Error during registration:", err);
      res.status(500).send("Internal Server Error");
    }
  }
);

//-------------------------- LOGOUT Route --------------------------//

app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

passport.use(
  "local",
  new Strategy(async function verify(username, password, cb) {
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1 ", [
        username,
      ]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;
        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) {
            console.error("Error comparing passwords:", err);
            return cb(err);
          } else {
            if (valid) {
              return cb(null, user);
            } else {
              return cb(null, false);
            }
          }
        });
      } else {
        return cb("User not found");
      }
    } catch (err) {
      console.log(err);
    }
  })
);

passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/home",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [
          profile.email,
        ]);
        if (result.rows.length === 0) {
          const newUser = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2)",
            [profile.email, "google"]
          );
          return cb(null, newUser.rows[0]);
        } else {
          return cb(null, result.rows[0]);
        }
      } catch (err) {
        return cb(err);
      }
    }
  )
);

passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user);
});

//-------------------------- ADMIN GET Routes --------------------------//

app.get(`/admin-login`, (req, res) => {
  active_page("home");
  let profileImageUrl = req.isAuthenticated()
    ? req.user.profile_image_url
    : favicon;
  res.render(__dirname + "/views/admin_login.ejs", {
    profile_name: "Admin",
    homeActive: home_active,
    cartActive: cart_active,
    socialActive: social_active,
    profileImageUrl: profileImageUrl,

  });
});

app.get(`/admin/${admin_password}`, (req, res) => {
  res.render(__dirname + "/views/admin.ejs");
});

app.get(`/admin/${admin_password}/create-product`, (req, res) => {
  res.render(__dirname + "/views/admin_create_product.ejs");
});

app.get(`/admin/${admin_password}/products`, async (req, res) => {
  let result = await db.query("SELECT * FROM products");
  res.render(__dirname + "/views/admin_product.ejs", { products: result.rows });
});

app.get(
  `/admin/${admin_password}/products/edit/:productId`,
  async (req, res) => {
    const productId = req.params.productId;
    let result = await db.query("SELECT * FROM products where id=$1", [
      productId,
    ]);
    res.render(__dirname + "/views/admin_product_edit.ejs", {
      product_detail: result.rows[0],
    });
  }
);

app.get(
  `/admin/${admin_password}/products/delete/:productId`,
  async (req, res) => {
    const productId = req.params.productId;
    let result = await db.query("SELECT * FROM products where id=$1", [
      productId,
    ]);
    res.render(__dirname + "/views/admin_product_confirm_delete.ejs", {
      product_detail: result.rows[0],
    });
  }
);

app.get(`/admin/logout`, async (req, res) => {
  active_page("home");
  const username = req.isAuthenticated()
    ? get_username(req.user.email)
    : "Guest"; // Check if user is authenticated
  res.redirect("/home");
});

//------------------------------------------------------ ADMIN LOGIN ROUTES ------------------------------------------------------//

// Admin login route
app.post("/admin-login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Fetch admin details from the database
    const result = await db.query("SELECT * FROM admins WHERE email = $1", [
      email,
    ]);

    if (result.rows.length === 0) {
      // Admin not found
      return res
        .status(401)
        .json({ message: "Login unsuccessful: Admin not found" });
    }

    const admin = result.rows[0];

    // Compare the provided password with the stored hashed password
    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (isPasswordValid) {
      // Password is correct, store admin session
      return res.render(__dirname + "/views/admin.ejs");
    } else {
      // Invalid password
      return res
        .status(401)
        .json({ message: "Login unsuccessful: Incorrect password" });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});

//------------------------------------------------------ ADMIN CREATE NEW product ------------------------------------------------------//

// Route to handle product creation with both PDF and cover image upload
app.post("/admin/products/create", async (req, res) => {
  try {
    const {
      name,
      company_name,
      production_location,
      actual_price,
      price,
      discount_percent,
      description,
      image_url,
      category,
      eco_friendly,
      recycled,
      locally_sourced,
    } = req.body;

    const result = await db.query(
      `INSERT INTO products (name, company_name, production_location, actual_price, price, discount_percent, description, image_url, category, eco_friendly, recycled, locally_sourced)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
      [
        name,
        company_name,
        production_location,
        actual_price,
        price,
        discount_percent,
        description,
        image_url,
        category,
        eco_friendly, // Pass the eco-friendly value
        recycled, // Pass the recycled value
        locally_sourced, // Pass the locally sourced value
      ]
    );

    // Redirect after successful insertion
    res.redirect(`/admin/${admin_password}`);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ error: error.message });
  }
});

//------------------------------------------------------ ADMIN EDIT product ------------------------------------------------------//

app.post("/admin/products/update/:productId", async (req, res) => {
  const productId = req.params.productId;
  const {
    name,
    company_name,
    production_location,
    actual_price,
    price,
    discount_percent,
    description,
    image_url,
    category,
    eco_friendly,
    recycled,
    locally_sourced,
    rating,
  } = req.body;

  try {
    // Update the product in the database
    const updateResult = await db.query(
      `UPDATE products
           SET name = $1, company_name = $2, production_location = $3, actual_price = $4,
               price = $5, discount_percent = $6, description = $7, image_url = $8,
               category = $9, eco_friendly = $10, recycled = $11, locally_sourced = $12,
               rating = $13 
           WHERE id = $14 RETURNING *`,
      [
        name,
        company_name,
        production_location,
        actual_price,
        price,
        discount_percent,
        description,
        image_url,
        category,
        eco_friendly,
        recycled,
        locally_sourced,
        rating,
        productId,
      ]
    );

    if (updateResult.rowCount > 0) {
      // Product updated successfully
      res.redirect(`/admin/${admin_password}/products`); // Redirect to the products management page
    } else {
      // Product not found
      res.status(404).send("Product not found");
    }
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).send("Server error");
  }
});

//------------------------------------------------------ DELETE product ------------------------------------------------------//

app.post("/admin/products/delete/:productId", async (req, res) => {
  const productId = req.params.productId;

  try {
    const productResult = await db.query(
      "SELECT * FROM products WHERE id = $1",
      [productId]
    );

    if (productResult.rowCount === 0) {
      return res.status(404).send("product not found");
    }

    await db.query("DELETE FROM products WHERE id = $1", [productId]);

    res.redirect(`/admin/${admin_password}/products`);
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).send("Server error");
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

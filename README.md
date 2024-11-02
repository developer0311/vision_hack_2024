#============================== CREATE .env FILE THEN COPY PASTE BELOW CODE AND SET VALUES ==============================#
#------------------------------- SERVER DETAILS -------------------------------#
SERVER_PORT=YOUR_SERVER_PORT


#------------------------------- POSTGRES DETAILS -------------------------------#
DB_USER=YOUR_USERNAME
DB_HOST=YOUR_HOSTNAME
DB_NAME=tour
DB_PASSWORD=YOUR_PASSWORD
DB_PORT=5432

**Then import the product.csv in your db for sample products**


#------------------------------- GOOGLE AUTH -------------------------------#
GOOGLE_CLIENT_ID="YOUR GOOGLE CLIENT ID"
GOOGLE_CLIENT_SECRET="YOUR CLIENT SECRET"
SESSION_SECRET="TOPSECRETWORD"


#============================== NPM SETUP ==============================#
cd over to the directory where you downloaded this project and write npm i in the command line to install packages


#============================== RUN THE PROJECT ==============================#
write nodemon run index.js in command line  and run the code in your localhost (make sure you installed nodemon gloablly)
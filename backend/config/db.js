import mongoose from 'mongoose'

export const connectDB = async () => {
    await mongoose.connect("mongodb+srv://jrmldesignofficial_db_user:ezwSknB7JSpamGQS@cluster0.tk5jzco.mongodb.net/EMS")
        .then(() => {
            console.log("Database Connected!");
        })
}
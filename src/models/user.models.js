import mongoose , {modelNames, Schema} from "mongoose";
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"



const userSchema = new Schema(
    {
        username : {
            type:String,
            requied:true,
            unique:true,
            lowercase:true,
            trim:true,
            index:true
        },
        email : {
            type:String,
            requied:true,
            unique:true,
            lowercase:true,
            trim:true,
        },
        fullname : {
            type:String,
            requied:true,
            trim:true,
            index:true
        },

        avatar:{
            type:String, // cloudinary url
            required:true
        },
        coverimage:{
            type:String
        },
        
        watchhistory:{
            type: Schema.Types.ObjectId,
            ref: "Video"
        },

        password:{
            type:String,
            required:[true,'password is compalsory']
        },
        refreshToken:{
            type:String
        }
    },{timestamps:true}
)

userSchema.pre("save" ,async function () {
    if(!this.isModified("password")) return ;

    this.password = await bcrypt.hash(this.password , 10)
        
})


userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,        // user id
      email: this.email,    // user email
      username: this.username,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET, // secret key
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY, // e.g. "1d"
    }
  );
};




export const user = mongoose.model("user" , userSchema)

  
import mongoose ,{Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";



const videoschema = new Schema(
    {
        videofile:{
            type:String, //cloundniary url
            required:true
        },
        thumbnail:{
            type:String,
            required:true
        },
        title:{
            type:String,
            required:true
        },
        description:{
            type:String,
            required:true
        },
        duration:{
            type:Number, // cloudinary url
            required:true
        },
        views:{
            type:Number,
            required:true
        },
        ispublshed:{
            type:Boolean,
            default:true
        },
        owner:{
            type:Schema.Types.ObjectId,
            ref:"user"
        }



    }
,{timestamps:true})


videoschema.plugin(mongooseAggregatePaginate)


     
const Video = mongoose.model("Video" , videoschema) 
require("dotenv").config();
const express=require("express");
const cors=require('cors');
const mongoose=require("mongoose");
const User=require('./models/User');
const Post=require("./models/Post");
const bcrypt= require('bcrypt');

const app=express();
const jwt= require('jsonwebtoken');
const cookieParser=require("cookie-parser");
const multer=require("multer");
const uploadMiddleware=multer({dest:'uploads/'});
const fs=require("fs");
const bodyParser=require("body-parser");

const salt=bcrypt.genSaltSync(10);
const secret=""+process.env.SECRET;
app.use(cors({credentials:true,origin:'*'}));
app.use(express.static("public"));

app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname + '/uploads'));


app.use(bodyParser.urlencoded({ extended: true }));
const dataBase=""+process.env.DATABASE;
mongoose.connect(dataBase,{useNewUrlParser:true}).then(()=>{
        console.log("database connected successfully");
   
   });

const UserSchema=new mongoose.Schema({

    username:{type:String,required:true,unique:true},
    password:{type:String,required:true}
});

const Usermodel= new mongoose.model('User',UserSchema);



 
app.post("/register",async(req,res)=>{
        
       const {username,password}=req.body;
       try{
         const UserDoc= await Usermodel.create({
            username,
            password:bcrypt.hashSync(password,salt)});
         res.json(UserDoc);
       } catch(e){
         res.status(400).json(e);
       }
        
});

app.post("/login",async(req,res)=>{
   try{
   const {username,password}= req.body;
   
   const UserDoc= await Usermodel.findOne({username});
   
   const passOK=await bcrypt.compareSync(password,UserDoc.password);
      
   
          if(passOK){
            
const token=jwt.sign({username,id:UserDoc._id},secret,{},(err,token)=>{
   if(err)
   throw err;
 res.cookie('token',token).json({
        id:UserDoc._id,
        username,
 });


});

          }
          else
          res.status(400).json('Oops! wrong credentials!');
         } catch(err)
         {
            res.status(400).send("invalid login details");
         }
         
});


app.get('/profile',(req,res)=>{
            const {token}= req.cookies;
            jwt.verify(token,secret,{},(err,info)=>{
                if(err) throw err;
                res.json(info);
            });
         });

app.post('/logout',(req,res)=>{
   res.clearCookie('token').json('ok');
});


app.post('/post',uploadMiddleware.single('file'),async (req,res) => {
               
   let {originalname,path} = req.file;
   console.log(originalname);
   let parts = originalname.split('.');
  let ext = parts[parts.length - 1];
  let newPath = path+'.'+ext;
  fs.renameSync(path, newPath);
  console.log(req.file);

  const {token} = req.cookies;
  jwt.verify(token, secret, {}, async (err,info) => {
    if (err) throw err;
    const {title,summary,content} = req.body;
    const postDoc = await Post.create({
      title,
      summary,
      content,
      cover:newPath,
      author:info.id,
    });
    res.json(postDoc);
  });

   
   

   
   
 
 });
app.put('/post',uploadMiddleware.single('file'), async (req,res) => {
   let newPath = null;
   if (req.file) {
     const {originalname,path} = req.file;
     const parts = originalname.split('.');
     const ext = parts[parts.length - 1];
     newPath = path+'.'+ext;
     fs.renameSync(path, newPath);
   }
 
   const {token} = req.cookies;
   jwt.verify(token, secret, {}, async (err,info) => {
     if (err) throw err;
     const {id,title,summary,content} = req.body;
     const postDoc = await Post.findById(id);
     const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
     if (!isAuthor) {
       return res.status(400).json('you are not the author');
     }
     await postDoc.updateOne({
       title,
       summary,
       content,
       cover: newPath ? newPath : postDoc.cover,
     });
 
     res.json(postDoc);
   });
 
 });



app.get('/post',async(req,res)=>{
    const posts= await Post.find().populate('author', ['username']).sort({createdAt: -1})
    .limit(20)
    
    
    ;

    res.json(posts);

})

app.get('/post/:id', async (req, res) => {
  const {id} = req.params;
  const postDoc = await Post.findById(id).populate('author', ['username']);
  res.json(postDoc);
})



app.listen(4000,()=>{
   console.log("server connected successfully");

});

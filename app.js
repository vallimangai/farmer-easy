require('dotenv').config();
const express=require("express");
const bodyParser=require("body-parser");
const ejs=require("ejs");
const path=require('path');
const https = require('https');
const mongoose=require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const multer=require('multer');
var _ = require('lodash');
var moment = require("moment")


const app = express()

app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({
    extended:true
}));

app.use(session({
    secret:"our Little secret.",
    resave: false,
    saveUninitialized:false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB",{
    useNewUrlParser:true,
    useUnifiedTopology: true
});

const userSchema=new mongoose.Schema({
    name:String,
    email:String,
    password: String,

});
var Storage= multer.diskStorage({
    destination:"public/upload/",
    filename:function(req,file,cb){
      cb(null,file.fieldname+"_"+Date.now()+path.extname(file.originalname));
    }
  });
  
  var upload=multer({
    storage:Storage,
    limits:{
      fileSize: 1024*1024*2
    }
  }).single('file');
  
userSchema.plugin(passportLocalMongoose);
const machineSchema=new mongoose.Schema({
    email:String,
    phone:String,
    price:Number,
    type1:String,
    availableDate:String,
    description:String,
    image:String
  });
  const machine=new mongoose.model("Machine",machineSchema);

const User= new mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(User,done){
    done(null,User.id);
});
passport.deserializeUser(function(id,done){
    User.findById(id,function(err,User){
        done(null,User);
    })
})



app.get("/",function(req,res){
    res.render("home");
})
app.get("/login",function(req,res){
    res.render("login");
})
app.get("/register",function(req,res){
    res.render("register");
})


app.post("/register",function(req,res){
    User.register({username: req.body.username, email:req.body.email},req.body.password,function(err,user){
        if(err){
            console.log(err);
            res.redirect("/register");
        }
        else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/weatheri");
            })
        }
    })
})
app.post("/login",function(req,res){
    const user =new User({
        username: req.body.username,
        password:req.body.password0
    });
    req.login(user,function(err){
        if(err){
            console.log(err);
        }
        else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/weatheri");
            })
        }
    })
})
app.get("/weatheri",function(req,res){
    console.log(req.user)
    if(req.isAuthenticated()){
    console.log(req.user.email)
    res.render("weatheri");
    }else{
        res.redirect("/login")
    }
})
app.post("/weather",function(req,res){
    const appkey=process.env.API;
    const unit="metric";
    const url="https:api.openweathermap.org/data/2.5/forecast?lat="+req.body.lat+"&lon="+req.body.lon+"&cnt=7"+"&units=metric&appid="+appkey;
    https.get(url,function(response){
        
        response.on("data",function(data){
            var weatherdata=JSON.parse(data)
            res.render("weather",{weatherdata:weatherdata})
        });
    })
})
app.get("/addmachines",function(req,res){
    if(req.isAuthenticated()){
        res.render("addmachines");
    }
    else{
        res.redirect("/login");
    }
});
app.post("/compose",upload,function(req,res){
    console.log(req.body);
    var newMachine=new machine({
      email:req.body.email,
      phone:req.body.phone,
      type1:req.body.type1,
      price:req.body.price,
      availableDate:req.body.daterange,
      description:req.body.desc,
    });
    if(req.file){
      newMachine.image=req.file.filename
    }
    newMachine.save(function(err){
      if(err)
        console.log(err);
      else
        res.send("Success");
    })
})
  
app.get('/machine/:_id',function(req,res){
    flag=0;
    n=req.params._id;
    machine.findById(n,function(err,result){
      if(!err){
        //console.log(result);
          res.render("machine",{
              email:result.email,
              phone:result.phone,
              type:result.type1,
              price:result.price,
              image:result.image,
              description:result.desc,
              daterange:result.availableDate,
              min:new moment(new Date(result.availableDate.split("-")[0])).format("YYYY-MM-DD"),
              max:new moment(new Date(result.availableDate.split("-")[1])).format("YYYY-MM-DD")
          });
      }
    });
  });
app.get("/machines",function(req,res){
    if(req.isAuthenticated()){
        machine.find(function(err,result){
        if(!err){
            console.log("success")
            res.render("machines",{mac:result});
        }
        })
    }else{
        res.redirect("/login");
    }
});
app.listen(8000,function(req,res){
    console.log("serving at 3000");
})
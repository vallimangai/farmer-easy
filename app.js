require('dotenv').config();
const express=require("express");
const bodyParser=require("body-parser");
const ejs=require("ejs");
const path=require('path');
const https = require('https');
const mongoose=require("mongoose");
const session = require("express-session");
const flash=require('connect-flash');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const multer=require('multer');
var _ = require('lodash');
var moment = require("moment")
var Noty=require('noty');
const { request } = require('http');

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
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB",{
    useNewUrlParser:true,
    useUnifiedTopology: true
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
const appointmentSchema =new mongoose.Schema({
    name:String,
    phone:String,
    email: String,
    date:String,
    time:String
})
const machineSchema=new mongoose.Schema({
    email:String,
    phone:String,
    price:Number,
    type1:String,
    licenseNumber:String,
    availableDate:String,
    bookedDate:[String],
    description:String,
    Rentee:[{type:mongoose.Schema.Types.ObjectId,ref:"User"}],
    image:String
  });
const machine=new mongoose.model("Machine",machineSchema);
const userSchema=new mongoose.Schema({
    name:String,
    email:String,
    password: String,
    machinesOwned: [{type:mongoose.Schema.Types.ObjectId,ref:"Machine"}],
    machinesRented:[{type:mongoose.Schema.Types.ObjectId,ref:"Machine"}],
    appointment:[{type:mongoose.Schema.Types.ObjectId,ref:"Appointment"}],
    rentedDate:[String],

});  
userSchema.plugin(passportLocalMongoose);


const User= new mongoose.model("User",userSchema);
const Appointment=new mongoose.model("Appointment",appointmentSchema);
passport.use(User.createStrategy());

passport.serializeUser(function(User,done){
    done(null,User.id);
});
passport.deserializeUser(function(id,done){
    User.findById(id,function(err,User){
        done(null,User);
    })
})

app.get("/logout",function(req,res){
    req.logOut();
    res.redirect("/");
});

app.get("/",function(req,res){
    //res.render("home");
    var userinfo;
    if(req.isAuthenticated()){
            userinfo=true;
    }else{
        userinfo=false;
    }
    var rand=Math.floor(Math.random()*4);
    const url="https://my-farmer-quotes.herokuapp.com/farmers?id="+rand
    https.get(url,function(response){
        console.log(response);
        response.on("data",function(data){
            var datas=JSON.parse(data)
            console.log(datas);
            res.render("home",{q:datas[0].quote,l:userinfo})
        });
    })
 
})
app.get("/schedule",function(req,res){
    if(req.isAuthenticated()){
        const url="https://my-seed-dis-api.herokuapp.com/seeds"
        https.get(url,function(response){
            //console.log(response);
            response.on("data",function(data){
                var datas=JSON.parse(data)
                console.log(datas[0]);
                res.render("schedule",{mac:datas,message :req.flash('message')})
            });
        })
    }else{
        res.redirect("/login");
    }
})
app.post("/subscribe",function(req,res){
    console.log(req.user.email);
    
        var data={
            members:[
                {
                    email_address:req.user.email,
                    status:"subscribed",
                    merge_fields:{
                        FNAME:req.user.username,
                        LNAME:"Farmer"
                    }
                }
            ]
        };
        const jsonData=JSON.stringify(data);
    const url="https:/us1.api.mailchimp.com/3.0/lists/030905a009";
    const options={
        method:"POST",
        auth:"valli:c4117d8335c9802cd0d9e0fbc1484e05-us1"
    }
    const request=https.request(url,options,function(response){
        response.on("data",function(data){
            console.log(JSON.parse(data));
        })
            if(response.statusCode==200){
                req.flash("message",'Added Successfully');
                res.redirect("/schedule");
            }
        })
    request.write(jsonData);
    request.end();
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
                res.redirect("/");
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
                res.redirect("/");
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
    const url="https:api.openweathermap.org/data/2.5/forecast?cnt=30&lat="+req.body.lat+"&lon="+req.body.lon+"&units=metric&appid="+appkey;
    https.get(url,function(response){
        
        response.on("data",function(data){
            var weatherdata=JSON.parse(data)
            //console.log(weatherdata);
            res.render("weather",{weatherdata:weatherdata})
        });
    })
})
app.get("/addmachines",function(req,res){
    if(req.isAuthenticated()){
        res.render("addmachines",{message :req.flash('message')});
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
      licenseNumber:req.body.plate,
      type1:req.body.type1,
      price:req.body.price,
      availableDate:req.body.daterange,
      description:req.body.desc,
    });
    if(req.file){
      newMachine.image=req.file.filename
    }
    req.user.machinesOwned.push(newMachine);
    newMachine.save(function(err){
        if(err)
            console.log(err);
    })
    req.user.save(function(err){
      if(err)
        console.log(err);
      else{
        req.flash("message",'Added Successfully');
        res.redirect("/addmachines");
      }
        //res.send("Success");
    })
})
  
app.get('/machine/:_id',function(req,res){
    flag=0;
    n=req.params._id;
    machine.findById(n,function(err,result){
      if(!err){
        //console.log(result);
          res.render("machine",{
              id:result._id,
              email:result.email,
              phone:result.phone,
              type:result.type1,
              license:result.licenseNumber,
              price:result.price,
              image:result.image,
              description:result.desc,
              daterange:result.availableDate,
              undate:result.bookedDate,
              min:new moment(new Date(result.availableDate.split("-")[0])).format("YYYY-MM-DD"),
              max:new moment(new Date(result.availableDate.split("-")[1])).format("YYYY-MM-DD"),
              message :req.flash('message')
          });
      }
    });
  });
  app.get('/rentedmachines',async function(req,res){
   if(req.isAuthenticated()){
    var dates=[];
    var macdetails;
    var macs=[];
    console.log(req.user)
    dates=req.user.rentedDate;
    macdetails=req.user.machinesRented;
    
    for(let i=0;i<macdetails.length;i++){
        macs.push(await machine.find({'_id':macdetails[i]}));
    }
    console.log("mac==="+macs);
    await res.render("rentedmachines",{date:dates,mac:macs});
   }else{
      res.redirect("/login");
   }
}) 
app.get('/bookingdetails/:_id',async function(req,res){
    n=req.params._id;
    var dates=[];
    var userdetails;
    var macs=[];
    var result=await machine.findById(n);
    dates=result.bookedDate;
    userdetails=result.Rentee;
    
    for(let i=0;i<userdetails.length;i++){
        macs.push(await User.find({'_id':userdetails[i]}));
    }
    console.log("mac==="+macs);
    await res.render("bookingdetails",{date:dates,mac:macs});
}) 
 app.get("/machines",function(req,res){
    if(req.isAuthenticated()){
    machine.find({},function(err,result){
        if(!err){
                //console.log(result)
                res.render("machines",{mac:result});
            }
    })
    }else{
        res.redirect("/login");
    }
});
app.get("/ownedmachines",async function(req,res){
    if(req.isAuthenticated()){
        var macs=[];
        var k=req.user.machinesOwned;
        for(let i=0;i<k.length;i++){
            macs.push(await machine.find({'_id':k[i]}));
        }
        console.log(macs);
        res.render("ownedmachines",{mac:macs});
    }else{
        res.redirect("/login");
    }
});
app.get("/bookappointment",function(req,res){
    if(req.isAuthenticated()){
    res.render("bookappointment",{message :req.flash('message')});
    }else{
        res.redirect("/login");
    }
})
app.post("/delete/:_id",function(req,res){
    n=req.params._id;
    Appointment.findByIdAndRemove(n,function(err){
        if(!err){
            console.log("yes");
        }
    })
    arr=req.user.appointment
    k=[]
    for(let i in arr){
        if(arr[i] != n )
            k.push(arr[i]);
    }
    req.user.appointment=k;
    req.user.save();
    req.flash("message",'Deleted Successfully');
    res.redirect("/viewappointment");
})
app.post("/bookappointment",async function(req,res){
    a=await Appointment.create(req.body);
    req.user.appointment.push(a);
    req.user.save();
    req.flash("message",'Booked Successfully');
    res.redirect("/bookappointment");
    //res.send("Success");
})

app.get("/viewappointment",async function(req,res){
    if(req.isAuthenticated()){
        if(req.user.username=="testagent"){
           Appointment.find({},function(err,result){
                if(!err){
                        console.log(req.user);
                        console.log(result)
                        res.render("viewappointmenttest",{mac:result});
                    }
            })
        }
        else{
        var macs=[];
        var k=req.user.appointment;
        for(let i=0;i<k.length;i++){
            macs.push(await Appointment.find({'_id':k[i]}));
        }
        console.log(macs);
        res.render("viewappointment",{mac:macs,message :req.flash('message')});
    }
    }else{
        res.redirect("/login");
    }
});
app.post("/book",function(req,res){
    if(req.isAuthenticated()){
        n=req.body.id;
        console.log(req.body.dts);
        machine.findById(n,function(err,result){
            if(!err){
                result.bookedDate.push(req.body.dts);
                result.Rentee.push(req.user._id);
                //console.log(result);
                req.user.rentedDate.push(req.body.dts);
                req.user.machinesRented.push(result);
                req.user.save();
                result.save();
                req.flash("message",'Booked Successfully');
                res.redirect("/machine/"+n);
            }
        });
    }
})
app.listen(8000,function(req,res){
    console.log("serving at 3000");
})
// f0c4e8165c2aca8e4b938f5c30d7068e-us20
// ce524ed7aa 

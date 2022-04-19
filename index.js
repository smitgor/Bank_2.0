const cookieParser = require('cookie-parser');
const express = require('express');
const app = express();
const path = require("path");
var fs = require('fs');

//google Auth
const {OAuth2Client} = require('google-auth-library');
const CLIENT_ID = '362882451560-857ftdld33frgtau631nhghem5cut650.apps.googleusercontent.com'
const client = new OAuth2Client(CLIENT_ID);

const port = process.env.PORT || 3000;

//middleware
app.set('view engine','ejs');
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '/')));

//Mongodb
var MongoClient = require('mongodb').MongoClient;  
const { ObjectId } = require('bson');
//var url="mongodb://localhost:27017/";
var url = "mongodb+srv://dbsmit:DBSMIT@cluster0.ff23x.mongodb.net/ISM_Bank?retryWrites=true&w=majority";




app.get('/', checkAuthenticated, (req,res) => {    
    let token = req.cookies['session-token'];
    var totalCoin = 0;
    var uname = '';
    function mongo(useremail) {
        return new Promise(data => {
            MongoClient.connect(url , function(err, db) {  
                if (err) throw err;
                var dbo = db.db("ISM_Bank");
                dbo.collection("account").findOne({email : useremail}, function(err, result) {  
                    if (err) throw err;  
                    data(result);
                    db.close();  
                });  
            });
        })
    }
    async function getData(){
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID,
        });
        const payload = ticket.getPayload();
        var data = await mongo(payload.email);
        uname = data.name;
        amount = data.amount;
        add = data._id;
    }
    getData()
    .then(()=>{1
            console.log(uname);
            console.log(uname,"asnbdg");
            res.render('dashboard',{
                diplayname : uname,
                diplayamount : amount,
                diplayadd : add

        });
    });
})

app.get('/login',(req,res) => {
    res.render('login');
})

app.post('/login',(req,res)=>{
    let token=req.body.token;
    console.log(token);
    async function verify() {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID,  // Specify the CLIENT_ID of the app that accesses the backend
            // Or, if multiple clients access the backend:
            //[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3]
        });
        const payload = ticket.getPayload();
        const userid = payload['sub'];
        useremail = payload.email;
        username = payload.name;
        // If request specified a G Suite domain:
        // const domain = payload['hd'];
        console.log(payload);
    }
    verify()
    .then(()=>{
        MongoClient.connect(url , function(err, db) {  
            if (err) throw err;  
            var user = useremail;
            var dbo = db.db("ISM_Bank");
            dbo.collection("account").findOne({email : useremail},(function(err,result){
                if(err) throw err;
                if(result==null)
                {
                    var info = {
                        name : username,
                        amount : 100,
                        email : useremail
                    };
                    var info2 = {
                        account_number : "Joining Bouse",
                        amount : 100,
                        date : new Date()
                        
                    };
                    console.log(info);
                    MongoClient.connect(url , function(err, db) {  
                        if (err) throw err;
                        dbo.collection("account").insertOne(info, function(err, res) {  
                            if (err) throw err;  
                            console.log(info);    
                            db.close();  
                        });  
                        dbo.collection(user).insertOne(info2, function(err, res) {  
                            if (err) throw err;  
                            console.log(info2);    
                        });  
                    });
                }
                else{
                    console.log("user is already in database");
                    dbo.collection("account").findOne({email : useremail},(function(err,result){
                        if(err) throw err;
                        //console.log("Available coin : ",result.amount);
                    }));
                }
            }));
        });
        res.cookie('session-token',token);
        res.send('success');
    }).catch(console.error);
})

app.get('/text',checkAuthenticated, (req, res) => {
    console.log(req.query);
    let user = req.user;

    res.send(`Hello ${user.name}`);
});

app.get('/transfer',checkAuthenticated, (req, res) => {
    let token = req.cookies['session-token'];
    var to = req.query.account;
    var amount = parseInt(req.query.amount);
    var from;
    var fromEmail;
    var toEmail;
    function findEmailFromId() {
        return new Promise(data => {
            MongoClient.connect(url , function(err, db) {  
                if (err) throw err;
                var dbo = db.db("ISM_Bank");
                dbo.collection("account").findOne({_id : ObjectId(to)}, function(err, result) {  
                    if (err) throw err;  
                    data(result);
                    db.close();  
                });  
            });
        })
    }
    function findIdFromEmail(e) {
        return new Promise(data => {
            MongoClient.connect(url , function(err, db) {  
                if (err) throw err;
                var dbo = db.db("ISM_Bank");
                dbo.collection("account").findOne({email : e}, function(err, result) {  
                    if (err) throw err;  
                    data(result);
                    db.close();  
                });  
            });
        })
    }
    function mongo1() {
        MongoClient.connect(url , function(err, db) {  
            if (err) throw err;
            var dbo = db.db("ISM_Bank");
            dbo.collection("account").findOneAndUpdate(
                {email : fromEmail},
                { $inc : { "amount" : -amount} },
                function(err, result){  
                    if (err) throw err; 
                    useremail = result.email;
                    //console.log(result);
            });  
            dbo.collection("account").findOneAndUpdate(
                {email : toEmail},
                { $inc : { "amount" : amount} },
                function(err, result){  
                    if (err) throw err; 
                    useremail = result.email;
                    //console.log(result);
            });
            var info = {
                account_number : to,
                amount : -amount,
                date : new Date()
            };
            var info2 = {
                account_number : from,
                amount : amount,
                date : new Date()
            };
            console.log(info); 
            dbo.collection(fromEmail).insertOne(info, function(err, res) {  
                if (err) throw err;  
                console.log(info);    
            });  
            dbo.collection(toEmail).insertOne(info2, function(err, res) {  
                if (err) throw err;  
                console.log(info2);  
            });  
        });
    } 

    async function getData(){
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID,
        });
        const payload =await ticket.getPayload();
        var temp = await findEmailFromId();
        toEmail = temp.email;
        // var info = await mongo(payload.email);
        fromEmail = payload.email;
        temp = await findIdFromEmail(fromEmail);
        from = temp._id;
        var temp = toString(from);
        const strId = from.toString();
        console.log(typeof strId); // string
        console.log("---------------------------------------------------");
        console.log(from);








        /// start with removing objectId("") from "FROM" variable










        //console.log(fromEmail);

        mongo1();
        // var data = await mongo(payload.email);
        // uname = data.name;
        // totalCoin = data.amount;
        // address = data._id;
    }
    getData()
    .then(()=>{
            // console.log(uname);
            // console.log(uname,"asnbdg");
            res.send(`Hello 
            ${fromEmail} - ${from}
            ${toEmail} - ${to}
            `);
        //console.log(useremail,"amsjydg");
    }).catch(console.error);
});

app.get('/history',checkAuthenticated, (req,res) => {
    let token = req.cookies['session-token'];
    var email;
    var data = [];
    function mongo(useremail) {
        return new Promise(data => {
            MongoClient.connect(url , function(err, db) {  
                if (err) throw err;
                var dbo = db.db("ISM_Bank");
                // console.log(useremail);
                const cursor = dbo.collection(useremail).find({}).toArray();  
                // console.log(cursor);
                data(cursor);

            });
        })
    }
    async function getData(){
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID,
        });
        const payload = ticket.getPayload();
        email = payload.email;
        data = await mongo(email);


    }
    getData()
    .then(()=>{
            res.render('history',{data});
    });
});

app.get('/sendmoney', checkAuthenticated, (req,res) =>{
    res.render('sendmoney');
})

app.get('/dashboard', checkAuthenticated, (req,res) => {
    let token = req.cookies['session-token'];
    var totalCoin = 0;
    var uname = '';
    function mongo(useremail) {
        return new Promise(data => {
            MongoClient.connect(url , function(err, db) {  
                if (err) throw err;
                var dbo = db.db("ISM_Bank");
                dbo.collection("account").findOne({email : useremail}, function(err, result) {  
                    if (err) throw err;  
                    data(result);
                    db.close();  
                });  
            });
        })
    }
    async function getData(){
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID,
        });
        const payload = ticket.getPayload();
        var data = await mongo(payload.email);
        uname = data.name;
        amount = data.amount;
        add = data._id;
    }
    getData()
    .then(()=>{
            console.log(uname);
            console.log(uname,"asnbdg");
            res.render('dashboard',{
                diplayname : uname,
                diplayamount : amount,
                diplayadd : add
        })
    });
})

app.get('/prorectedroute', checkAuthenticated,(req,res) => {
    res.render('protectedView');
})

app.get('/logout',(req,res)=>{
    res.clearCookie('session-token')
    res.redirect('/login')
})

function checkAuthenticated(req, res, next){

    let token = req.cookies['session-token'];

    let user = {};
    async function verify() {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID,  // Specify the CLIENT_ID of the app that accesses the backend
        });
        const payload = ticket.getPayload();
        user.name = payload.name;
        user.email = payload.email;
        user.picture = payload.picture;
      }
      verify()
      .then(()=>{
          req.user = user;
          next();
      })
      .catch(err=>{
          res.redirect('/login')
      })

}


app.listen(port, ()=>{
    console.log(`Sever is running ${port}`);
})
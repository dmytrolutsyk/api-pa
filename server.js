const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const MongoClient = require('mongodb').MongoClient;
const { ObjectId } = require('mongodb').ObjectId;
const assert = require('assert');
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://root:root@cluster0-0vedk.mongodb.net/test?retryWrites=true&w=majority";
const PORT = process.env.PORT || 3000;
const client = new MongoClient( MONGODB_URI, { useNewUrlParser: true });
var db;
const app = express();
const url = process.env.MONGODB_URI || 'mongodb://localhost:' + 27017 + '/annonces';
const dbName = "annonces";
const JWT_SIGN_SECRET ='secret';
const multer = require('multer');
const { Server } = require('http');
var upload = multer({ dest: 'uploads/' })

//IMPORTS DE TEST POUR IMAGE
// let fs = require('fs');
// let Gridfs = require('gridfs-stream');
// let multiparty = require('multiparty');
// var im = require('imagemagick');
// let mime = require('mime-types');

async function authentication(req, res, next){
    let response =  await app.post('/signin',req.app.post('/signin', async function(req, res){}));
    if (response.error){
        res.status(response.statusCode).send(response);
        return;
    }
    res.user = response.messsage;
    console.log("middleware used")
    await next();
}

function generateTokenForUser(userData) {
    return jwt.sign({
        userId: userData._id,
        username: userData.username,
        password: userData.password
    },
    JWT_SIGN_SECRET,
    {
        expiresIn: '24h'
    })
}

function dateNow(){
    var dateNow = new Date();
    var day = dateNow.getDate();
    var month = dateNow.getMonth();
    var year = dateNow.getFullYear();
    var hour = dateNow.getHours();
    var minutes = dateNow.getMinutes();
    var seconds = dateNow.getSeconds();
    month += 1;
    const dateFormatted = formatDigits(day) + '/' + formatDigits(month) + '/' + year + ' ' + formatDigits(hour+2) + ':' + formatDigits(minutes) + ':' + formatDigits(seconds);
    return dateFormatted;
}

function formatDigits(number){
    if(number < 10) {
        number = ('0' + number);
    }
    return number;
}

function isUsernameValid(str){
    if(typeof(str)!== 'string'){
        return false;
    }
    for(var i=0;i<str.length;i++){
        if(str.charCodeAt(i)>122 || str.charCodeAt(i)<97){
            return false;
        }
    }
    return true;
} 


(async function() {
    try {
       var connected = await client.connect();
       db = connected.db('annonces-api');
    } catch (err) { console.log(err.stack); }
    })();

    

    app.listen(PORT, function () {
        console.log('Example app listening on port ', PORT)
    })

  app.use(express.json());

  app.get('/', (req, res) => {
    res.send('Hello World!');
  });

  app.post('/signin', async function(req, res){
    //Params
    var username = req.body.username;
    var password = req.body.password;
    var user = null;
    console.log("in signin")
  
    const col = db.collection('users');

    if (password == null){
        return res.status(400).json({'error': 'Le mot de passe doit contenir au moins 4 caractères', 'token': undefined});
    } else if(!username){
        return res.status(400).json({'error': 'Votre identifiant doit contenir entre 2 et 20 caractères', 'token': undefined});
    }else if(password.length <= 3) {
        return res.status(400).json({'error': 'Le mot de passe doit contenir au moins 4 caractères'});
    }else if(username.length <= 2 || username.length >= 21 ) {
        return res.status(400).json({'error': 'Votre identifiant doit contenir entre 2 et 20 caractères'});
    }else if(!isUsernameValid(username)) {
        return res.status(400).json({'error': 'Votre identifiant ne doit contenir que des lettres minuscules non accentuées',
        'token': undefined});
    }

    let data = await col.find({}).toArray();
    if (data.some(data => data.username === req.body.username)) {
        
        data.forEach(element => {
            if(element.username === req.body.username){              
               user = element
            }
        });
        bcrypt.compare(password, user.password, function(errBycrypt, resBycrypt) {
            if (resBycrypt) {
                return res.status(200).json({
                    'error': null,
                    'UserId': user._id,
                    'token': generateTokenForUser(user)
                });
            } else {
                return res.status(403).json({ "error": "Cet identifiant est inconnu"});
            }
        });
    }else {
            return res.status(403).json({ 'error': 'Cet identifiant est inconnu' });
        }
});

  app.post('/signup', async function(req, res){
    // Params
    let username = req.body != undefined? req.body.username : null;
    let password = req.body != undefined? req.body.password : null;
    const col = db.collection('users');
  
    if (password == null) {
        return res.status(400).json({'error': 'Le mot de passe doit contenir au moins 4 caractères', 'token': undefined});
    } else if (!username) {
        return res.status(400).json({'error': 'Votre identifiant doit contenir entre 2 et 20 caractères', 'token': undefined});
    }else if(password.length <= 3) {
        return res.status(400).json({'error': 'Le mot de passe doit contenir au moins 4 caractères', 
        'token': undefined});
    }else if(username.length <= 2 || username.length >= 21 ) {
        return res.status(400).json({'error': 'Votre identifiant doit contenir entre 2 et 20 caractères',
        'token': undefined});
    }else if(!isUsernameValid(username)) {
        return res.status(400).json({'error': 'Votre identifiant ne doit contenir que des lettres minuscules non accentuées',
        'token': undefined});
    }
    
    let data = await col.find({}).toArray();
    if (data.some(data => data.username === req.body.username)) {
        return res.status(400).json({ 'error': 'Cet identifiant est déjà associé à un compte',
        'token': undefined});
    } else {
        bcrypt.hash(password, 5, function(err, bcryptedpassword){
            let user = {
                username: username,
                password: bcryptedpassword,
            };
            col.insertOne(user, (err, result) => {
                if (err) {
                    return res.status(500).json({ 'error': 'cannot add user'});
                } else {
                    //resolve({ data: { createdId: result.insertedId }, statusCode: 201 });
                    user._id = result.insertedId;
                    return res.status(200).json({ 'createdId': result.insertedId, 'error': null, 
                    'token': generateTokenForUser(user)  })
                }
            });
        });

    }
});

 app.use(authentication);

  /* GET annonceS */
  app.get('/annonces', async function(req, res) {
    var token = req.get('x-access-token');
    jwt.verify(token, JWT_SIGN_SECRET, async (err, data) => {
        if (err) {
            res.status(401).send('Utilisateur non connecté');
        } else {
                try {
                    let userID =  data.userId;
                    const col = db.collection('annonces');
                    let results = await col.find({ userID: userID}).sort({ _id: -1}).toArray();
                    res.send({
                        error: null,
                        annonces: results
                    });
                } catch (err) {
                    res.send({
                        error: err
                    });
                }            
        }
    });
    
});

/*GET all annonces*/
app.get('/annonces/all', async function(req, res) {
    var token = req.get('x-access-token');
                try {
                    const col = db.collection('annonces');
                    let results = await col.find().sort({ _id: -1}).toArray();
                    res.send({
                        error: null,
                        annonces: results
                    });
                } catch (err) {
                    res.send({
                        error: err
                    });
                }            
});

/*GET all users*/
app.get('/users/all', async function(req, res) {
                try {
                    const col = db.collection('users');
                    let results = await col.find().sort({ _id: -1}).toArray();
                    res.send({
                        error: null,
                        annonces: results
                    });
                } catch (err) {
                    res.send({
                        error: err
                    });
                }            
});

/* PUT A annonce */
app.put('/annonces', async function(req, res) {
    var token = req.get('x-access-token');
    jwt.verify(token, JWT_SIGN_SECRET, async (err, data) => {
        if (err) {
            res.status(401).send('Utilisateur non connecté');
        } else {    
                const col = db.collection('annonces');   
                //INSERT ONE DOCUMENT
                let userID = data.userId;
                let title = req.body.title;
                let description = req.body.description;
                let category = req.body.category;
                let type = req.body.type;
                let createdAt = dateNow();
                let photos = req.body != undefined? req.body.photos : null;
                let lastUpdatedAt = null;
                let username = req.body != undefined? req.body.username : null;
                
                if(title.length === 0 || description.length === 0 || category.length === 0 || type.length === 0){
                    res.status(400).send({error: 'Tout les champs n\'ont pas été saisi'});
                } else {
                    let resInsert = await col.insertOne({
                        userID,
                        username,
                        title,
                        description,
                        category,
                        type,
                        photos,
                        createdAt,
                        lastUpdatedAt
                    });
                    let annonce = resInsert.ops[0];
                    res.send({
                        error: null,
                        annonce
                    });
                }
        }
    });

});

/* Patch A annonce */
app.patch('/annonces/:id', async function(req, res) {
    var token = req.get('x-access-token');
    jwt.verify(token, JWT_SIGN_SECRET, async (err, data) => {
        if (err) {
            res.status(401).send('Utilisateur non connecté');
        } else {
            const col = db.collection('annonces');
            let title = req.body.title;
            let description = req.body.description;
            let category = req.body.category;
            let type = req.body.type;
            let photos = req.file != undefined? req.file.photos : null;
            let lastUpdatedAt = dateNow();
            if(title.length === 0 || description.length === 0 || category.length === 0 || type.length === 0){
                res.status(400).send({error: 'Aucun contenu n\'a été saisi'});
            } else {
                const annonce = await col.findOne({_id: ObjectId(req.params.id)});
                const user = await db.collection('users').findOne({ _id: ObjectId(data.userId) });
                if (!annonce){
                    res.status(404).send({error: 'Cet identifiant est inconnu'});
                    return;
                }
                if (annonce.userID.toString() !== user._id.toString()) {
                    res.status(403).json({ error: "Accès non autorisé à cette annonce" });
                  } else {
                    await col.updateOne(
                        {_id: ObjectId(req.params.id)},
                        {$set: 
                            {
                                lastUpdatedAt: lastUpdatedAt,
                                title: req.body.title,
                                description: req.body.description,
                                category: req.body.category,
                                type: req.body.type,
                                photos: upload.single(photos),
                            }
                     }
                    );
                    const newannonce = await col.findOne({_id: ObjectId(req.params.id)});
                    res.status(200).send({
                        error: null,
                        annonce: newannonce
                    });
                }
            }
        }
    });
});


/* Delete A annonce */
app.delete('/annonces/:id', async function(req, res) {
    var token = req.get('x-access-token');
    jwt.verify(token, JWT_SIGN_SECRET, async (err, data) => {
        if (err) {
            res.status(401).send('Utilisateur non connecté');
        } else {
            try {
                const col = db.collection('annonces');
                //DELETE ONE DOCUMENT
                let id_annonce = req.params.id;
                let annonceResults = await col.find().toArray();
                let resultForEach = 0;
                
                let annonceToBeDeleted;
                annonceResults.forEach(function (resForEach) {
                    if(resForEach._id.equals(id_annonce)){
                        resultForEach = 1;
                        annonceToBeDeleted = resForEach;
                    }
                });
                if(resultForEach === 0) {
                    res.status(404).send({error: 'Cet identifiant est inconnu'});
                } else if(annonceToBeDeleted.userID !== data.userId){
                    res.status(403).send({error: 'Accès non autorisé à cette annonce'})
                } else {
                    await col.deleteOne({_id: annonceToBeDeleted._id});
                    res.send({
                        error: null
                    });
                }
            } catch (err) {
                res.send({
                    error: err
                });
            }
        }
    });
});

app.patch('/users/:id', async function(req, res) {
    var token = req.get('x-access-token');
    jwt.verify(token, JWT_SIGN_SECRET, async (err, data) => {
        if (err) {
            console.log(err)
            res.status(401).send('Utilisateur non connecté');
        } else {
            const col = db.collection('users');
            var username = req.body.username;
            var password = req.body.password;
            var ville = req.body.ville;
            var email = req.body.email;
            var status_user = req.body.status_user;
            var phone = req.body.phone;
            let lastUpdatedAt = dateNow();
            if(username.length === 0 && password.length === 0 && ville.length === 0 && email.length === 0 && status_user.length === 0 && phone.length === 0){
                res.status(400).send({error: 'Aucun contenu n\'a été saisi'});
            } else {
                // const annonce = await col.findOne({_id: ObjectId(req.params.id)});
                const user = await db.collection('users').findOne({ _id: ObjectId(data.userId) });
                if (!user){
                    res.status(404).send({error: 'Cet identifiant est inconnu'});
                    return;
                }
                else{
                    console.log("user trouvé !!!!!")
                }
                // if (user.userID.toString() !== user._id.toString()) {
                //     res.status(403).json({ error: "Accès non autorisé à cet utilisateur" });
                //   } else {
                    await col.updateOne(

                        {_id: ObjectId(req.params.id)},
                        {$set: {username: req.body.username,
                            password: req.body.password,
                            ville: req.body.ville,
                            status_user: req.body.status_user,
                            phone: req.body.phone,
                            lastUpdatedAt: lastUpdatedAt}}
                    );
                    const newuser = await col.findOne({_id: ObjectId(req.params.id)});
                    res.status(200).send({
                        error: null,
                        user: newuser
                    });
                // }
            }
        }
    });
});

 /* GET Category */
 app.get('/category', async function(req, res) {
    var token = req.get('x-access-token');
    jwt.verify(token, JWT_SIGN_SECRET, async (err, data) => {
        if (err) {
            res.status(401).send('Utilisateur non connecté');
        } else {
                try {

                    let category = ["Animaux","Bricolage","Electroménager","Informatique", "Instruments de Musique", "Jardinage", "Jeux & Jouets", "Mobilier", "Multimédia", "Sport", "Véhicules", "Vêtements"];
                    let userID =  data.userId;
                    let user = await db.collection('users').findOne({ _id: ObjectId(userID) });
                    console.log(user);
                    res.send({
                    category             
                    });
                } catch (err) {
                    console.log(err);
                    res.send({
                        error: err
                    });
                }            
        }
    });
    
});



 /* GET user profil */
 app.get('/users', async function(req, res) {
    var token = req.get('x-access-token');
    jwt.verify(token, JWT_SIGN_SECRET, async (err, data) => {
        if (err) {
            res.status(401).send('Utilisateur non connecté');
        } else {
                try {
                    let userID =  data.userId;
                    let user = await db.collection('users').findOne({ _id: ObjectId(userID) });
                    console.log(user);
                    res.send({
                        error: null,
                        user: user
                    });
                } catch (err) {
                    console.log(err);
                    res.send({
                        error: err
                    });
                }            
        }
    });
    
});

/* Delete user */
app.delete('/users/:id', async function(req, res) {
    var token = req.get('x-access-token');
    jwt.verify(token, JWT_SIGN_SECRET, async (err, data) => {
        if (err) {
            res.status(401).send('Utilisateur non connecté');
        } else {
            try {
                const col = db.collection('users');
                //DELETE ONE DOCUMENT
                let id_user = req.params.id;
                let userResults = await col.find().toArray();
                let resultForEach = 0;
                
                let userToBeDeleted;
                userResults.forEach(function (resForEach) {
                    if(resForEach._id.equals(id_user)){
                        resultForEach = 1;
                        userToBeDeleted = resForEach;
                    }
                });
                if(resultForEach === 0) {
                    res.status(404).send({error: 'Cet identifiant est inconnu'});
                //} else if(userToBeDeleted.userID !== data.userId){
                //    res.status(403).send({error: 'Accès non autorisé à cette annonce'})
                } else {
                    await col.deleteOne({_id: userToBeDeleted._id});
                    res.send({
                        error: null,
                        "event" : "Le compte a bien été goumé de la surface"
                    });
                    console.log("User deleted")
                }
            } catch (err) {
                res.send({
                    error: err
                });
            }
        }
    });
});

// app.put('/image', async function(req, res) {
//   var token = req.get('x-access-token');
//   jwt.verify(token, JWT_SIGN_SECRET, async (err, data) => {
//         if (err) {
//             res.status(401).send('Utilisateur non connecté');
//         } else {   
//             let gfs = new Gridfs(connected, db); // on instancie l'objet GridFS
//             let form = new multiparty.Form({maxFilesSize: 1024 * 1024 * 2});
//             form.parse(req, function (err, fields, files) { //On parse les informations du formulaire

//                 if( mime.lookup(files.file[0].path) === 'image/png' ||
//                 mime.lookup(files.file[0].path) === 'image/jpeg' ||
//                 mime.lookup(files.file[0].path) === 'image/gif' ||
//                 mime.lookup(files.file[0].path) === 'image/pjpeg' ||
//                 mime.lookup(files.file[0].path) ==='image/x-png')
//                 {
//                 im.identify(files.file[0].path, function(err, features){

//                     if(err) console.log(err);

//                     if (!err) {

//                         let writestream = gfs.createWriteStream({
//                         filename: files.file[0].originalFilename,
//                         mode: 'w',
//                         content_type: mime.lookup(files.file[0].path),
//                         metadata: {
//                             width : features.width,
//                             height: features.height,
//                             extension: files.file[0].originalFilename.split('.').pop()
//                         }
//                         });

//                         fs.createReadStream(files.file[0].path).pipe(writestream);

//                         writestream.on('close', function (file) {

//                         fs.unlink(files.file[0].path, function (err) {
//                             if (err) console.log(err);
//                             // handle error
//                             //console.log('success!');

//                             return res.send(file);
//                         });

//                         });
//                     }
//                     });

//                 }
//                 else {
//                 return res.status(400).send({err : 'err type file, only png, gif or jpeg, type : '
//                 + mime.lookup(files.file[0].path)});
//                 }

//             });
//         }
//     });
// });

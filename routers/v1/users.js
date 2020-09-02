const router = require('express').Router();
const admin = require('firebase-admin');
const strCheck = require('string-similarity');
const auth = require('../../middleware/auth');
const Cache = require('../../cache');

router.use(auth);

router.get('/search',async (req, res) =>{
    let {keyword} = req.query;

    let users = [];

    if(Cache.instance().get("users")=== undefined){
            Cache.instance().set("users",[]);
            let docs = await admin.firestore().collection("users").listDocuments();
            for (let i = 0; i < docs.length; i++) {
                Cache.instance().get("users").push((await docs[i].get()).data());
            }

        }
    users = Cache.instance().get("users");
    if(keyword===undefined) {
        // Select all users
        res.status(200).send({
            users:users
        });
        return;
    }
    keyword = keyword.trim().toLowerCase();
    // Select user by the keywords
    let queryResult = [];
    for(let i=0;i<users.length;i++){
        let si = Math.max(
            strCheck.compareTwoStrings(users[i].email.trim().toLowerCase(),keyword),
            strCheck.compareTwoStrings(users[i].firstName.trim().toLowerCase(),keyword),
            strCheck.compareTwoStrings(users[i].lastName.trim().toLowerCase(),keyword),
            strCheck.compareTwoStrings(users[i].firstName.trim().toLowerCase() +" "+ users[i].lastName.trim().toLowerCase(),keyword),
            strCheck.compareTwoStrings(users[i].phoneNumber.trim(),keyword));
        if(si > 0.2){
            queryResult.push({
                si:si,
                user:users[i]
            });
        }
    }

    queryResult = queryResult.sort((a,b) => (a.si < b.si));
    res.status(200).send({
        users:queryResult.map((result)=>result.user)
    });

});

router.get('/is-signed-up',async (req,res)=>{
    const {id} = req.query;
    if(id === undefined){
        res.status(400).send({
            message:"The user id is not found"
        });
        return;
    }
    try {
        let result = (await admin.firestore().collection("users").doc(id).get()).exists;
        res.status(200).send({
            signedUp:result
        });
    }
    catch(e){
        res.status(500).send({
            message:"Internal Server Error"
        });
    }
});

router.post('/sign-up', auth, async (req,res)=>{

    const {
        email,
        firstName,
        lastName,
        phoneNumber,
        uid
    } = req.user;

    try{
        let userDoc = admin.firestore().collection("users").doc(uid);
        if((await userDoc.get()).exists){
            res.status(400).send({
                message:"User ["+email+"] is already existed"
            });
            return;
        }
        await userDoc.set({
            ...req.user
        });
        if(Cache.instance().get("users")===undefined){
            Cache.instance().set("users",[]);
        }
        Cache.instance().get("users").push({...req.user});

        res.status(201).send({
            message:"User ["+email+"] is created"
        });
    }
    catch(e){
        res.status(500).send({
            message:"Internal Server Error"
        });
    }

});

router.get('/friends',auth, async (req,res)=>{
    const {uid} = req.user;
    try{
        let userDoc = (await admin.firestore().collection("users").doc(uid).get()).data();
        if(userDoc===undefined){
            res.status(401).send({
                message:"User ["+uid+"] is not existed"
            });
            return;
        }
        if(userDoc['friends'] !== undefined){
            res.status(200).send({
                friends:[
                    ...userDoc['friends']
                ]
            });
        }
        else{
            res.status(200).send({
                friends:[]
            });
        }
    }
    catch(e){
        res.status(500).send({
            message:"Internal Server Error"
        });
    }
});

router.delete("/friends", auth, async (req, res)=>{
   const {uid} = req.user;
   const {friendId} = req.body;
   if(friendId === undefined){
       res.status(401).send({
           message:"Require friend's id"
       });
    return;
   }
   try {
       await admin.firestore().collection("users").doc(uid).update({
           friends: admin.firestore.FieldValue.arrayRemove(friendId)
       });
       await admin.firestore().collection("users").doc(friendId).update({
           friends: admin.firestore.FieldValue.arrayRemove(uid)
       });
       res.status(200).send({
           message:"Deleted friend ["+friendId+"]"
       });
   }
   catch(e){
       res.status(500).send({
           message:"Internal Server Error"
       });
   }

});

router.get('/friends/invitation',auth, async (req,res)=>{
    const {uid} = req.user;
    try {
        let userRef = admin.firestore().collection("users").doc(uid);
        let userDoc = (await userRef.get()).data();
        if (userDoc === undefined) {
            res.status(401).send({
                message: "User [" + uid + "] is not existed"
            });
            return;
        }

        let invitationDoc = await userRef.collection("invitation").listDocuments();
        let invitation = [];
        for(let i = 0;i<invitationDoc.length;i++){
            invitation.push((await invitationDoc[i].get()).data());
        }

        res.status(200).send({
            invitation: invitation
        });

    }
    catch(e){
        res.status(500).send({
            message:"Internal Server Error"
        });
    }
});

router.post('/friends/invitation', auth, async (req,res)=>{
    const {uid} = req.user;
    const {friendId} = req.body;
    if(friendId === undefined){
        res.status(401).send({
            message:"Require friend's id"
        });
        return;
    }
    try{

        let myDoc = admin.firestore().collection("users").doc(uid);
        let friendDoc = admin.firestore().collection("users").doc(friendId);

        let existedInvitation = await myDoc.collection("invitation").where("to","==",friendId).get();
        if(!existedInvitation.empty){
            res.status(401).send({
                message:"Invitation to ["+friendId+"] is already existed"
            });
            return;
        }
        let time = Date.now().toString();
        const invitation = {
            from: uid,
            to: friendId,
            time:time
        };

        await myDoc.collection("invitation").doc(time).set(invitation);
        await friendDoc.collection("invitation").doc(time).set(invitation);
        res.status(200).send({
            message: "User ["+uid+"] invite ["+friendId+"] to be a friend"
        });
    }
    catch(e){
        res.status(500).send({
            message:"Internal Server Error"
        });
    }
});

router.delete("/friends/invitation",auth, async (req,res)=>{
    const {invitationId} = req.body;
    const {uid} = req.user;
    if(invitationId === undefined){
        res.status(401).send({
            message:"Require invitation id"
        });
        return;
    }
    try {
        let invitationDoc = admin.firestore().collection("users").doc(uid).collection("invitation").doc(invitationId);
        let invitation = (await invitationDoc.get()).data();
        if(invitation === undefined){
            res.status(401).send({
                message:"Invitation id is invalid"
            });
            return;
        }
        await invitationDoc.delete();
        await admin.firestore().collection("users").doc(invitation["to"]).collection("invitation").doc(invitationId).delete();
        res.status(200).send({
            message:"Deleted invitation ["+invitationId+"]"
        });
    }
    catch(e){
        res.status(500).send({
            message:"Internal Server Error"
        });
    }
});

router.post("/friends/invitation/accept",auth, async (req,res)=>{
    const {invitationId} = req.body;
    const {uid} = req.user;
    if(invitationId === undefined){
        res.status(401).send({
            message:"Require invitation id"
        });
        return;
    }
    try {
        let invitationDoc = admin.firestore().collection("users").doc(uid).collection("invitation").doc(invitationId);
        let invitation = (await invitationDoc.get()).data();
        if(invitation['to']===uid){
            // Accepted
            let myDoc = admin.firestore().collection("users").doc(uid);
            await myDoc.update({
                friends:admin.firestore.FieldValue.arrayUnion(invitation["from"])
            });
            await admin.firestore().collection("users").doc(invitation["from"]).update({
                friends:admin.firestore.FieldValue.arrayUnion(uid)
            });
            await admin.firestore().collection("users").doc(uid).collection("invitation").doc(invitationId).delete();
            await admin.firestore().collection("users").doc(invitation['from']).collection("invitation").doc(invitationId).delete();
            res.status(200).send({
                message: "Accepted invitation ["+invitationId+"]"
            });
            return;
        }
        else {
            res.status(401).send({
                message: "Invitation id is invalid"
            });
            return;

        }

    }
    catch(e){
        res.status(500).send({
            message:"Internal Server Error"
        });
    }
});

module.exports = router;
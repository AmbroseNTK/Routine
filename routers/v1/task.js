const admin = require('firebase-admin');
const auth = require('../../middleware/auth');
const router = require('express').Router();

router.use(auth);

router.get("/",async (req,res)=>{
   const {uid} = req.user;
   try{
       let taskDocs = await admin.firestore().collection("users").doc(uid).collection("tasks").listDocuments();
       let tasks = [];
       for(let i=0;i<taskDocs.length;i++){
           tasks.push((await taskDocs[i].get()).data());
       }
       res.status(200).send({
           tasks:tasks
       });
   }
   catch(e){
       res.status(500).send({
           message: "Internal Server Error"
       });
   }
});

router.post("/",async (req,res)=> {
    if (req.body.task === undefined) {
        res.status(401).send({
            message: "Require a task"
        });
        return;
    }
    const {assignTo, content, due} = req.body.task;
    const {uid} = req.user;

    if(assignTo === undefined){
        res.status(401).send({
            message:"Require assignee id"
        });
        return;
    }
    try {
        let myDoc = admin.firestore().collection("users").doc(uid);
        let myData = await myDoc.get();
        if(myData.empty){
            res.status(401).send({
                message:"User ["+uid+"] is not found"
            });
            return;
        }
        if(myData.data()['friends'] !== undefined){
            if(uid !== assignTo && !myData.data()['friends'].includes(assignTo)){
                res.status(401).send({
                    message:"Assign task to ["+assignTo+"] is not allow"
                });
                return;
            }
        }
        let date = Date.now().toString();
        let task = {
            from: uid,
            assignTo:assignTo,
            content:content,
            due:due===undefined?"":due,
            date:date,
            status: {
                done:"undone",
            }
        }
        if(uid === assignTo){
            await myDoc.collection("tasks").doc(date).set(task);
        }
        else {
            await myDoc.collection("tasks").doc(date).set(task);
            await admin.firestore().collection("users").doc(assignTo)
                .collection("tasks").doc(date).set(task);

        }
        res.status(200).send({
            message:"Task ["+date+"] is created"
        });
    } catch (e) {
        console.log(e);
        res.status(500).send({
            message: "Internal Server Error"
        });
    }
});

router.put('/',async (req,res)=>{
    const {uid} = req.user;
    if(req.body.task === undefined){
        res.status(401).send({
            message: "Require a task"
        });
        return;
    }
    let {taskId, content, due, status} = req.body.task;
    if(status === undefined){
        status = {
            done:"undone"
        };
    }
    try {
        let myDoc = admin.firestore().collection("users").doc(uid);
        let taskDoc = myDoc.collection("tasks").doc(taskId);
        let taskData = await taskDoc.get();
        if (taskData.empty) {
            res.status(401).send({
                message: "Task [" + taskId + "] is not found"
            });
            return;
        }
        let assigneeId = taskData.data()['assignTo'];
        await taskDoc.update({
            content: content,
            due: due,
            status: status
        });
        await admin.firestore().collection("users")
            .doc(assigneeId).collection("tasks")
            .doc(taskId).update({
                content: content,
                due: due,
                status: status
            });
        res.status(200).send({
            message: "Updated [" + taskId + "]"
        });
    }
    catch(e){
        res.status(500).send({
            message: "Internal Server Error"
        });
    }
});

router.delete("/", async (req,res)=>{
   const {uid} = req.user;
   const {taskId} = req.body;
   if(taskId === undefined){
       res.status(401).send({
           message:"Deleted ["+taskId+"]"
       });
   }
   try{
       let taskDoc = await admin.firestore().collection("users").doc(uid).collection("tasks").doc(taskId);
       let taskData = (await taskDoc.get());
       if(taskData.empty){
           res.status(401).send({
               message:"Task ["+taskId+"] is not found"
           });
           return;
       }
       if(taskData.data()['from'] !== uid){
           res.status(401).send({
               message:"Delete task ["+taskId+"] is not allow"
           });
           return;
       }
       let assigneeId = taskData.data()['assignTo'];
       await taskDoc.delete();
       await admin.firestore().collection("users").doc(assigneeId).collection("tasks").doc(taskId).delete();
       res.status(200).send({
           message:"Task ["+taskId+"] is deleted"
       });
   }
   catch(e) {
       res.status(500).send({
           message: "Internal Server Error"
       });
   }
});

module.exports = router;
import express,{Request ,Response} from 'express';
import jwt from 'jsonwebtoken'

const app = express ();
app.use(express.json());

app.post('signup',async(req : Request, res: Response )=>{`  `
    const username = req.body.username;
    const password = req.body.password;

})


app.post('/signin',async(req : Request ,res : Response )=>{

})

app.post('/orders',async(req : Request, res : Response)=>{

})

app.get('/orders.orderid',async(req : Request, res : Response)=>{

})

app.delete('/orders',async(req : Request, res : Response)=>{

})

app.get('/orders',async(req : Request, res : Response)=>{

})

app.get('/balance/usd',async(req : Request, res : Response)=>{

})


app.get('/balance',async(req : Request, res : Response)=>{

})




app.listen (3000);
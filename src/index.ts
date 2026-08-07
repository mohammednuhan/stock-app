import express,{Request ,Response} from 'express';
import jwt from 'jsonwebtoken'

const app = express ();
app.use(express.json());

app.post('signup',async(req : Request, res: Response )=>{
    const username = req.body.username;
    const password = req.body.password;

    const userExist = users.find ((u)=> username === username )

})


app.post('/login',async(req : Request ,res : Response )=>{

})


app.listen (3000);
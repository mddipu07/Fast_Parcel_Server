const express = require('express');
const app =express();
const cors = require('cors');
const dotenv = require('dotenv');
require('dotenv').config()
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


const stripe = require('stripe')(process.env.Payment_Gateway_Key);


app.use(cors());
app.use(express.json());



const uri =`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.h3fyjhx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();
    const db = client.db('parcelDB');
    const parcelCollection = db.collection('parcels')

  app.get('/parcels', async(req,res) =>{
    const parcels = await parcelCollection.find().toArray();
    res.send(parcels)
  })

  // parcels api
  app.get('/parcels', async(req,res) =>{
    try{
      const userEmail = req.query.email;

      const query = userEmail ? {created_by: userEmail } : {};
      const options ={
        sort: { createdAt: -1 }, 
      };

      const parcels = await parcelCollection.find(query , options).toArray();
      res.send(parcels)
    }
    catch(error) {
      console.error('Error fetching parcels:', error);
      res.status(500).send({message:'Failed to get parcels'})
    }
  });
        // Get a specific parcel by ID
   app.get('/parcels/:id',async (req,res) =>{
      try{
        const id = req.params.id;
        const parcel = await parcelCollection.findOne({_id: new ObjectId(id)});
        if(!parcel){
          return res.status(404).send({message:'Parcel not found'});
        }
        res.send(parcel)
      }
      catch(error){
        console.error("Error fetching parcel:" , error);
        res.status(500).send({message: 'Failled to fetch parcel'});
      }
   })

  app.post('/parcels', async (req,res) =>{
    try {
        const newParcel = req.body;
        const result = await parcelCollection.insertOne(newParcel);
        res.status(201).send(result)
    }
    catch(error){
        console.error('Error inserting parcel:', error);
        res.status(500).send({message:'Failed to create parcel'});
    }
  });

  app.delete('/parcels/:id', async(req,res) =>{
      try{
        const id = req.params.id;

        const result = await parcelCollection.deleteOne({_id: new ObjectId(id)});
        if(result.deletedCount === 0){
           return res.status(404).send({message:'Parcel not found'});
        }
        res.send({message:'Parcel deleted successfully'});
      }
      catch(error){
        console.error('Error deleting parcel:', error);
        res.status(500).send({message:'Failled to delete parcel'})
      }
  });

  
  // POST: Record payment and update parcel status
        app.post('/payments', async (req, res) => {
            try {
                const { parcelId, email, amount, paymentMethod, transactionId } = req.body;

                // 1. Update parcel's payment_status
                const updateResult = await parcelsCollection.updateOne(
                    { _id: new ObjectId(parcelId) },
                    {
                        $set: {
                            payment_status: 'paid'
                        }
                    }
                );

                if (updateResult.modifiedCount === 0) {
                    return res.status(404).send({ message: 'Parcel not found or already paid' });
                }

                // 2. Insert payment record
                const paymentDoc = {
                    parcelId,
                    email,
                    amount,
                    paymentMethod,
                    transactionId,
                    paid_at_string: new Date().toISOString(),
                    paid_At: new Date(),
                };

                const paymentResult = await paymentsCollection.insertOne(paymentDoc);

                res.status(201).send({
                    message: 'Payment recorded and parcel marked as paid',
                    insertedId: paymentResult.insertedId,
                });

            } catch (error) {
                console.error('Payment processing failed:', error);
                res.status(500).send({ message: 'Failed to record payment' });
            }
        });




app.post('/create-payment-intent', async (req, res) => {
  const amountInCents = req.body.amountInCents
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents, // amount in cents
      currency: 'usd',
      payment_method_types: ['card'],
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

   



    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req,res) =>{
    res.send('Parcel Server is running');
})

app.listen(port,() =>{
    console.log(`Server is Listenning on port ${port}`);
})
const express = require('express');
const { Kafka } = require('kafkajs');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const kafka = new Kafka({
    clientId: 'bolt-order-service',
    brokers: ['localhost:9092']
});

const producer = kafka.producer();

const TiDB_Mock = {
    saveOrder: async (orderData) => {
        return new Promise((resolve) => {
            setTimeout(() => resolve({ ...orderData, savedAt: Date.now() }), 50);
        });
    }
};

app.post('/api/v1/rides/request', async (req, res) => {
    try {
        const { passengerId, pickupLocation, dropoffLocation, serviceType } = req.body;

        if (!passengerId || !pickupLocation) {
            return res.status(400).json({ error: "Missing required geospatial or user data" });
        }

        const orderId = crypto.randomUUID();
        const orderPayload = {
            orderId,
            passengerId,
            pickupLocation,
            dropoffLocation,
            serviceType: serviceType || 'standard',
            status: 'pending',
            timestamp: Date.now()
        };

        await TiDB_Mock.saveOrder(orderPayload);

        await producer.send({
            topic: 'order_created',
            messages: [
                {
                    key: passengerId,
                    value: JSON.stringify(orderPayload)
                }
            ]
        });

        return res.status(202).json({
            success: true,
            message: "Ride request accepted and is being processed",
            data: {
                orderId,
                status: "searching_driver"
            }
        });

    } catch (error) {
        return res.status(500).json({ success: false, error: "Internal Server Error" });
    }
});

const startService = async () => {
    try {
        await producer.connect();
        app.listen(3000, () => {
            console.log('API running on port 3000');
        });
    } catch (error) {
        process.exit(1);
    }
};

startService();
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    try {


        console.log('Incoming Headers:', req.headers); // Check terminal output
        
    // ... rest of middleware
        // read the authorization header
        const authHeader = req.header['authorization'] || req.header['Authorization'];
        
        // checking if header exists
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                message: "Access denied. No authentication token provided."
            });
        }

        // extract the token string by splitting on space
        const token = authHeader.split(' ')[1];

        if(!token){
            return res.status(401).json({
                message: "Accessed denied. Malformed authentication token"
            });
        }

        // verify token and expiration using jwt secret

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded;
        next();


    } catch (err) {
        res.status(401).json({
            message: "Invalid or expired token"
        });
    }
}

module.exports = authenticateToken;
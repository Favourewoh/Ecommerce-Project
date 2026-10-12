

const authorizeRoles = (...allowedRoles) => {
        return (req, res, next) => {
            // ensure the user object exists
            if(!req.user || !req.user.role) {
                return res.status(401).json({
                    message: "Authentication required."
                });
            }

            // check for user.role inside allowedRoles array
            if(!allowedRoles.includes(req.user.role)) {
                return res.status(403).json({
                    message: "Access denied. You do not have the permission to perform this action"
                });
            }

            // the user has the required role, proceed!
            next();
        };


};


module.exports = authorizeRoles


const userDashboard = (req, res) => {
    res.status(200).json({
      message: `Welcome to the dashboard, User #${req.user.id}`,
      Role: req.user.role,
    });
  };



const adminDashboard = (req, res) => {
    res.status(200).json({
      message: `Welcome to the Admin Control Panel`,
      Role: req.user.role,
    });
  };

  module.exports = {
    userDashboard,
    adminDashboard
  };
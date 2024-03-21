import { Router } from "express";
import { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory } from "../controllers/user.controllers.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser);

router.route("/login").post(loginUser)

// Secured routes
router.route("/logout").post( verifyJWT , logoutUser )
router.route("/refreshToken").post( refreshAccessToken )
router.route("/changePassword").post( verifyJWT , changeCurrentPassword )
router.route("/currentUser").post( verifyJWT , getCurrentUser )
router.route("/updateAccount").patch( verifyJWT , updateAccountDetails )

router.route("/avatar").patch( verifyJWT , upload.single("avatar") , updateUserAvatar )
router.route("/coverImage").patch( verifyJWT , upload.single("coverImage") , updateUserCoverImage )

router.route("/c/:username").get( verifyJWT , getUserChannelProfile ) // : means req.params when we used
router.route("/history").get( verifyJWT , getWatchHistory )


export default router;

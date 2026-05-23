import React, { useState } from "react";
import "./DeleteUser.css";
import { userDelete } from "../services/Authentication";
import { ToastContainer, toast } from 'react-toastify';
import Lottie from "react-lottie";
import animation from "../constants/animation";
import {useLocation} from 'react-router-dom'

// DeleteAccountModal.js
// React component styled with external CSS instead of Tailwind.

export default function DeleteAccountModal() {
    const [email, setEmail] = useState("");
    const [open, setOpen] = useState(true);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false)

    const loadingAnimation = {
        loop: true,
        autoplay: true,
        animationData: animation.CIRCLE_LOADING_1,
        rendererSettings: {
            preserveAspectRatio: 'xMidYMid slice'
        }
    }

    
    

    const close = () => setOpen(false);

    const validateEmail = (value) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    };

    const onDelete = async (e) => {
        setIsLoading(true)
        e.preventDefault();
        if (!validateEmail(email)) {
            setError("Please enter a valid email");
            return;
        }
        setError("");
        const deletingUser = await userDelete({ email })
        if (!deletingUser?.status) {
            toast.warning(deletingUser?.message, { position: 'top-center' })
            setIsLoading(false)
            // alert(deletingUser?.message)
        } else {
            toast.success(deletingUser?.message, { position: 'top-center' })
            setIsLoading(false)

            // alert('Something went wrong')
        }


        // setOpen(false);
    };



    return (
        <div className="page-wrapper">
            <div className="page-border"></div>
            <ToastContainer />

            <div className="modal-card">
                <div className="modal-content">
                    <div className="modal-header">
                        <h3 className="modal-subtitle">Delete Account</h3>
                    </div>

                    <h2 className="modal-title">Confirm your email</h2>

                    <p className="modal-description">
                        Enter your email address to confirm you want to delete your account. This action is irreversible.
                    </p>

                    <form className="modal-form" onSubmit={onDelete}>
                        <label htmlFor="email" className="sr-only">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email"
                            className="input-field"
                        />
                        {error && <p className="error-text">{error}</p>}

                        <div className="btn-group">

                            <button type="submit" className="delete-btn">
                                {
                                    isLoading ?
                                        <Lottie options={loadingAnimation} height={25} width={25} />
                                        :
                                        'Delete'
                                }
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

/* DeleteAccountModal.css */

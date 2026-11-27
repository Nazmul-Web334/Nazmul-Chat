import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getFirestore,
    collection,
    addDoc,
    query,
    where,
    onSnapshot,
    serverTimestamp,
    doc,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


/* =====================================
   FIREBASE CONFIGURATION
===================================== */

const firebaseConfig = {
    apiKey: "AIzaSyC1654973_jPI2EZboOCr-3StHikY824A",
    authDomain: "nazmul-chat-c5935.firebaseapp.com",
    projectId: "nazmul-chat-c5935",
    storageBucket: "nazmul-chat-c5935.firebasestorage.app",
    messagingSenderId: "272668949196",
    appId: "1:272668949196:web:1454adde483c474b9fe069",
    measurementId: "G-YCQJ16FBNB"
};


/* =====================================
   FIREBASE INITIALIZATION
===================================== */

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


/* =====================================
   USER VARIABLES
===================================== */

let myName = "";
let myMobile = "";
let receiverMobile = "";

let stopMessages = null;
let stopReceiverStatus = null;
let stopTypingStatus = null;
let stopIncomingCalls = null;
let stopCurrentCall = null;
let stopCandidateListener = null;

let heartbeatTimer = null;
let typingTimer = null;
let receiverLastSeen = null;


/* =====================================
   HTML ELEMENTS
===================================== */

const loginBox = document.getElementById("loginBox");
const chatApp = document.getElementById("chatApp");

const nameInput = document.getElementById("nameInput");
const mobileInput = document.getElementById("mobileInput");

const myInfo = document.getElementById("myInfo");
const myStatus = document.getElementById("myStatus");

const receiverInput = document.getElementById("receiverInput");
const chatInfo = document.getElementById("chatInfo");

let receiverStatus = document.getElementById("receiverStatus");

const messagesBox = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const typingIndicator = document.getElementById("typingIndicator");
const sendButton = document.getElementById("sendButton");

const loginButton = document.getElementById("loginButton");
const chatButton = document.getElementById("chatButton");
const logoutButton = document.getElementById("logoutButton");


/* =====================================
   CALL ELEMENTS
===================================== */

const audioCallButton = document.getElementById("audioCallButton");
const videoCallButton = document.getElementById("videoCallButton");

const callStatus = document.getElementById("callStatus");

const incomingCallBox = document.getElementById("incomingCallBox");
const incomingCallText = document.getElementById("incomingCallText");

const acceptCallButton = document.getElementById("acceptCallButton");
const rejectCallButton = document.getElementById("rejectCallButton");
const endCallButton = document.getElementById("endCallButton");

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

const localVideoBox = document.getElementById("localVideoBox");
const remoteVideoBox = document.getElementById("remoteVideoBox");


/* =====================================
   WEBRTC VARIABLES
===================================== */

let peerConnection = null;
let localStream = null;

let currentCallId = null;
let currentCallType = null;

let incomingCallData = null;

let pendingCandidates = [];

let isCallActive = false;


const rtcConfig = {
    iceServers: [
        {
            urls: "stun:stun.l.google.com:19302"
        }
    ]
};


/* =====================================
   USER DOCUMENT ID
===================================== */

function getUserId(mobile) {

    return encodeURIComponent(mobile);

}


/* =====================================
   CHAT ID
===================================== */

function getChatId() {

    const users = [
        myMobile,
        receiverMobile
    ];

    users.sort();

    return users[0] + "_" + users[1];

}


/* =====================================
   PRESENCE UPDATE
===================================== */

async function updateMyPresence() {

    if (!myMobile) return;

    try {

        await setDoc(

            doc(db, "users", getUserId(myMobile)),

            {
                name: myName,
                mobile: myMobile,
                online: true,
                lastSeen: serverTimestamp()
            },

            {
                merge: true
            }

        );

        myStatus.innerHTML = "🟢 Online";
        myStatus.className = "online";

    } catch (error) {

        console.error("Presence error:", error);

    }

}


/* =====================================
   START HEARTBEAT
===================================== */

function startHeartbeat() {

    stopHeartbeat();

    updateMyPresence();

    heartbeatTimer = setInterval(
        updateMyPresence,
        10000
    );

}


/* =====================================
   STOP HEARTBEAT
===================================== */

function stopHeartbeat() {

    if (heartbeatTimer) {

        clearInterval(heartbeatTimer);
        heartbeatTimer = null;

    }

}


/* =====================================
   SET OFFLINE
===================================== */

async function setOffline() {

    if (!myMobile) return;

    stopHeartbeat();

    try {

        await setDoc(

            doc(db, "users", getUserId(myMobile)),

            {
                online: false,
                lastSeen: serverTimestamp()
            },

            {
                merge: true
            }

        );

    } catch (error) {

        console.error("Offline error:", error);

    }

}


/* =====================================
   LOGIN
===================================== */

loginButton.addEventListener("click", login);


function login() {

    const name = nameInput.value.trim();
    const mobile = mobileInput.value.trim();

    if (!name) {

        alert("আপনার নাম লিখুন।");
        return;

    }

    if (!mobile) {

        alert("আপনার মোবাইল নম্বর লিখুন।");
        return;

    }

    myName = name;
    myMobile = mobile;

    localStorage.setItem("nazmulChatName", myName);
    localStorage.setItem("nazmulChatMobile", myMobile);

    openChat();

}


/* =====================================
   OPEN CHAT APP
===================================== */

function openChat() {

    loginBox.style.display = "none";

    chatApp.style.display = "flex";

    myInfo.innerText = myName + " | " + myMobile;

    myStatus.innerHTML = "🟢 Online";
    myStatus.className = "online";

    startHeartbeat();

    startIncomingCallListener();

}


/* =====================================
   START CHAT
===================================== */

chatButton.addEventListener("click", startChat);


function startChat() {

    const newReceiver = receiverInput.value.trim();

    if (!newReceiver) {

        alert("যার সাথে Chat করবেন তার মোবাইল নম্বর দিন।");
        return;

    }

    if (newReceiver === myMobile) {

        alert("নিজের সাথে Chat করা যাবে না।");
        return;

    }

    if (receiverMobile && receiverMobile !== newReceiver) {

        clearTimeout(typingTimer);

        setTyping(false);

    }

    receiverMobile = newReceiver;

    chatInfo.innerHTML =
        "আপনি এখন Chat করছেন: " +
        receiverMobile +
        '<div id="receiverStatus">স্ট্যাটাস দেখা হচ্ছে...</div>';

    // নতুন Receiver Status Element সংগ্রহ
    receiverStatus = document.getElementById("receiverStatus");

    messageInput.disabled = false;
    sendButton.disabled = false;

    loadMessages();
    loadReceiverStatus();
    loadTypingStatus();

    typingIndicator.innerText = "";

}


/* =====================================
   LOAD RECEIVER STATUS
===================================== */

function loadReceiverStatus() {

    if (stopReceiverStatus) {

        stopReceiverStatus();
        stopReceiverStatus = null;

    }

    receiverLastSeen = null;

    const userRef = doc(
        db,
        "users",
        getUserId(receiverMobile)
    );

    stopReceiverStatus = onSnapshot(

        userRef,

        function(snapshot) {

            if (!snapshot.exists()) {

                receiverLastSeen = null;

                receiverStatus.innerText = "⚪ Offline";
                receiverStatus.className = "offline";

                return;

            }

            const data = snapshot.data();

            receiverLastSeen = data.lastSeen || null;

            updateReceiverStatus();

        },

        function(error) {

            console.error("Status error:", error);

            receiverStatus.innerText = "স্ট্যাটাস পাওয়া যায়নি";

        }

    );

}


/* =====================================
   UPDATE RECEIVER STATUS
===================================== */

function updateReceiverStatus() {

    if (!receiverLastSeen) {

        receiverStatus.innerText = "⚪ Offline";
        receiverStatus.className = "offline";

        return;

    }

    let lastTime;

    try {

        lastTime = receiverLastSeen.toMillis();

    } catch (error) {

        receiverStatus.innerText = "⚪ Offline";
        receiverStatus.className = "offline";

        return;

    }

    const difference = Date.now() - lastTime;

    if (difference < 30000 && difference >= 0) {

        receiverStatus.innerText = "🟢 Online";
        receiverStatus.className = "online";

    } else {

        receiverStatus.innerText = "⚪ Offline";
        receiverStatus.className = "offline";

    }

}


/* =====================================
   STATUS REFRESH
===================================== */

setInterval(function() {

    if (receiverMobile && receiverStatus) {

        updateReceiverStatus();

    }

}, 5000);


/* =====================================
   TYPING STATUS
===================================== */

async function setTyping(status) {

    if (!myMobile || !receiverMobile) return;

    try {

        await setDoc(

            doc(db, "typing", getChatId()),

            {
                user: myMobile,
                typing: status,
                updatedAt: serverTimestamp()
            },

            {
                merge: true
            }

        );

    } catch (error) {

        console.error("Typing error:", error);

    }

}


/* =====================================
   TYPING INPUT EVENT
===================================== */

messageInput.addEventListener("input", function() {

    if (!receiverMobile) return;

    setTyping(true);

    clearTimeout(typingTimer);

    typingTimer = setTimeout(function() {

        setTyping(false);

    }, 1500);

});


/* =====================================
   LOAD TYPING STATUS
===================================== */

function loadTypingStatus() {

    if (stopTypingStatus) {

        stopTypingStatus();
        stopTypingStatus = null;

    }

    const typingRef = doc(
        db,
        "typing",
        getChatId()
    );

    stopTypingStatus = onSnapshot(

        typingRef,

        function(snapshot) {

            if (!snapshot.exists()) {

                typingIndicator.innerText = "";
                return;

            }

            const data = snapshot.data();

            if (
                data.typing === true &&
                data.user !== myMobile
            ) {

                typingIndicator.innerText = "✍️ লিখছে...";

            } else {

                typingIndicator.innerText = "";

            }

        },

        function(error) {

            console.error("Typing status error:", error);

        }

    );

}


/* =====================================
   SEND MESSAGE
===================================== */

sendButton.addEventListener("click", sendMessage);


// Enter চাপলেও মেসেজ পাঠানো যাবে
messageInput.addEventListener("keydown", function(event) {

    if (event.key === "Enter" && !event.shiftKey) {

        event.preventDefault();

        sendMessage();

    }

});


async function sendMessage() {

    const text = messageInput.value.trim();

    if (!text || !receiverMobile) return;

    sendButton.disabled = true;

    try {

        await addDoc(

            collection(db, "messages"),

            {
                chatId: getChatId(),
                text: text,
                senderName: myName,
                senderMobile: myMobile,
                receiverMobile: receiverMobile,
                createdAt: serverTimestamp()
            }

        );

        clearTimeout(typingTimer);

        await setTyping(false);

        messageInput.value = "";

    } catch (error) {

        console.error("Send message error:", error);

        alert("মেসেজ পাঠানো যায়নি।");

    } finally {

        sendButton.disabled = false;

    }

}


/* =====================================
   LOAD MESSAGES
===================================== */

function loadMessages() {

    if (stopMessages) {

        stopMessages();
        stopMessages = null;

    }

    messagesBox.innerHTML = "মেসেজ লোড হচ্ছে...";

    const chatQuery = query(

        collection(db, "messages"),

        where("chatId", "==", getChatId())

    );

    stopMessages = onSnapshot(

        chatQuery,

        function(snapshot) {

            messagesBox.innerHTML = "";

            const messages = [];

            snapshot.forEach(function(messageDoc) {

                messages.push(messageDoc.data());

            });

            messages.sort(function(a, b) {

                const timeA = a.createdAt
                    ? a.createdAt.toMillis()
                    : 0;

                const timeB = b.createdAt
                    ? b.createdAt.toMillis()
                    : 0;

                return timeA - timeB;

            });

            messages.forEach(function(data) {

                const message = document.createElement("div");

                const mine = data.senderMobile === myMobile;

                message.className = mine
                    ? "message sent"
                    : "message received";

                const sender = document.createElement("div");

                sender.className = "sender";
                sender.innerText = data.senderName || "";

                const text = document.createElement("div");

                text.innerText = data.text || "";

                message.appendChild(sender);
                message.appendChild(text);

                messagesBox.appendChild(message);

            });

            messagesBox.scrollTop = messagesBox.scrollHeight;

        },

        function(error) {

            console.error("Message loading error:", error);

            messagesBox.innerHTML = "❌ মেসেজ লোড করা যায়নি।";

        }

    );

}


/* =====================================
   WEBRTC CALL STATUS
===================================== */

function showCallStatus(message) {

    callStatus.innerText = message;
    callStatus.style.display = "block";

}


function hideIncomingCall() {

    incomingCallBox.style.display = "none";

}


/* =====================================
   REMOTE ICE CANDIDATES
===================================== */

function listenForRemoteCandidates(collectionName) {

    if (stopCandidateListener) {

        stopCandidateListener();
        stopCandidateListener = null;

    }

    const candidatesRef = collection(
        db,
        "calls",
        currentCallId,
        collectionName
    );

    stopCandidateListener = onSnapshot(

        candidatesRef,

        function(snapshot) {

            snapshot.docChanges().forEach(async function(change) {

                if (change.type !== "added") return;

                const candidateData = change.doc.data();

                try {

                    if (
                        peerConnection &&
                        peerConnection.remoteDescription
                    ) {

                        await peerConnection.addIceCandidate(
                            new RTCIceCandidate(candidateData)
                        );

                    } else {

                        pendingCandidates.push(candidateData);

                    }

                } catch (error) {

                    console.error("ICE candidate error:", error);

                }

            });

        },

        function(error) {

            console.error("Candidate listener error:", error);

        }

    );

}


/* =====================================
   PROCESS PENDING CANDIDATES
===================================== */

async function processPendingCandidates() {

    if (!peerConnection || !peerConnection.remoteDescription) {
        return;
    }

    const candidates = [...pendingCandidates];

    pendingCandidates = [];

    for (const candidate of candidates) {

        try {

            await peerConnection.addIceCandidate(
                new RTCIceCandidate(candidate)
            );

        } catch (error) {

            console.error("Pending candidate error:", error);

        }

    }

}


/* =====================================
   SETUP PEER CONNECTION
===================================== */

function setupPeerConnection(candidateCollection) {

    peerConnection = new RTCPeerConnection(rtcConfig);

    localStream.getTracks().forEach(function(track) {

        peerConnection.addTrack(track, localStream);

    });

    peerConnection.onicecandidate = async function(event) {

        if (!event.candidate || !currentCallId) return;

        try {

            await addDoc(

                collection(
                    db,
                    "calls",
                    currentCallId,
                    candidateCollection
                ),

                event.candidate.toJSON()

            );

        } catch (error) {

            console.error("Could not send ICE candidate:", error);

        }

    };

    peerConnection.ontrack = function(event) {

        if (event.streams && event.streams[0]) {

            remoteVideo.srcObject = event.streams[0];

        }

        if (currentCallType === "video") {

            remoteVideoBox.style.display = "block";

        }

    };

    peerConnection.onconnectionstatechange = function() {

        if (!peerConnection) return;

        const state = peerConnection.connectionState;

        if (state === "connected") {

            isCallActive = true;

            showCallStatus("🟢 কল সংযুক্ত হয়েছে");

        } else if (state === "failed") {

            showCallStatus("সংযোগ ব্যর্থ হয়েছে। নেটওয়ার্ক পরীক্ষা করো।");

        } else if (state === "disconnected") {

            showCallStatus("সংযোগ বিচ্ছিন্ন হয়েছে...");

        }

    };

}


/* =====================================
   START AUDIO / VIDEO CALL
===================================== */

async function startCall(type) {

    if (!receiverMobile) {

        alert("আগে অপর ব্যক্তির নম্বর দিয়ে Chat শুরু করো।");
        return;

    }

    if (currentCallId || peerConnection) {

        alert("আগের কলটি শেষ করে আবার চেষ্টা করো।");
        return;

    }

    try {

        currentCallType = type;

        localStream = await navigator.mediaDevices.getUserMedia({

            audio: true,
            video: type === "video"

        });

        localVideo.srcObject = localStream;

        localVideoBox.style.display =
            type === "video" ? "block" : "none";

        remoteVideoBox.style.display =
            type === "video" ? "block" : "none";

        setupPeerConnection("callerCandidates");

        const callRef = doc(collection(db, "calls"));

        currentCallId = callRef.id;

        await setDoc(callRef, {

            callerMobile: myMobile,
            callerName: myName,
            receiverMobile: receiverMobile,
            type: type,
            status: "creating",
            createdAt: serverTimestamp()

        });

        const offer = await peerConnection.createOffer();

        await peerConnection.setLocalDescription(offer);

        await setDoc(

            callRef,

            {
                offer: {
                    type: offer.type,
                    sdp: offer.sdp
                },
                status: "ringing"
            },

            {
                merge: true
            }

        );

        endCallButton.style.display = "block";

        showCallStatus("📞 কল করা হচ্ছে: " + receiverMobile);

        stopCurrentCall = onSnapshot(

            callRef,

            async function(snapshot) {

                if (!snapshot.exists()) return;

                const data = snapshot.data();

                if (
                    data.answer &&
                    peerConnection &&
                    !peerConnection.remoteDescription
                ) {

                    try {

                        await peerConnection.setRemoteDescription(
                            new RTCSessionDescription(data.answer)
                        );

                        await processPendingCandidates();

                        listenForRemoteCandidates("receiverCandidates");

                    } catch (error) {

                        console.error("Answer error:", error);

                    }

                }

                if (
                    data.status === "ended" ||
                    data.status === "rejected"
                ) {

                    cleanupCall();

                }

            }

        );

    } catch (error) {

        console.error("Start call error:", error);

        alert(
            "কল শুরু করা যায়নি। ক্যামেরা ও মাইক্রোফোনের অনুমতি এবং HTTPS সংযোগ পরীক্ষা করো।"
        );

        await cleanupCall();

    }

}


/* =====================================
   INCOMING CALL LISTENER
===================================== */

function startIncomingCallListener() {

    if (stopIncomingCalls) {

        stopIncomingCalls();
        stopIncomingCalls = null;

    }

    const callsQuery = query(

        collection(db, "calls"),

        where("receiverMobile", "==", myMobile)

    );

    stopIncomingCalls = onSnapshot(

        callsQuery,

        function(snapshot) {

            snapshot.docChanges().forEach(function(change) {

                const data = change.doc.data();

                if (
                    data.status === "ringing" &&
                    data.callerMobile !== myMobile &&
                    !currentCallId
                ) {

                    incomingCallData = {
                        ...data,
                        id: change.doc.id
                    };

                    incomingCallText.innerText =
                        "📞 " +
                        (data.callerName || data.callerMobile) +
                        " আপনাকে " +
                        (data.type === "video" ? "ভিডিও" : "অডিও") +
                        " কল করছেন";

                    incomingCallBox.style.display = "block";

                }

                if (
                    incomingCallData &&
                    incomingCallData.id === change.doc.id &&
                    data.status !== "ringing"
                ) {

                    hideIncomingCall();

                }

            });

        },

        function(error) {

            console.error("Incoming call error:", error);

        }

    );

}


/* =====================================
   ACCEPT INCOMING CALL
===================================== */

async function acceptCall() {

    if (!incomingCallData) return;

    const callData = incomingCallData;

    try {

        currentCallId = callData.id;

        currentCallType = callData.type;

        localStream = await navigator.mediaDevices.getUserMedia({

            audio: true,
            video: currentCallType === "video"

        });

        localVideo.srcObject = localStream;

        localVideoBox.style.display =
            currentCallType === "video" ? "block" : "none";

        remoteVideoBox.style.display =
            currentCallType === "video" ? "block" : "none";

        setupPeerConnection("receiverCandidates");

        await peerConnection.setRemoteDescription(

            new RTCSessionDescription(callData.offer)

        );

        await processPendingCandidates();

        listenForRemoteCandidates("callerCandidates");

        const answer = await peerConnection.createAnswer();

        await peerConnection.setLocalDescription(answer);

        await setDoc(

            doc(db, "calls", currentCallId),

            {

                answer: {
                    type: answer.type,
                    sdp: answer.sdp
                },

                status: "active"

            },

            {
                merge: true
            }

        );

        const callRef = doc(db, "calls", currentCallId);

        stopCurrentCall = onSnapshot(

            callRef,

            function(snapshot) {

                if (!snapshot.exists()) return;

                const data = snapshot.data();

                if (
                    data.status === "ended" ||
                    data.status === "rejected"
                ) {

                    cleanupCall();

                }

            }

        );

        incomingCallData = null;

        hideIncomingCall();

        endCallButton.style.display = "block";

        showCallStatus("🔄 কল সংযোগ হচ্ছে...");

    } catch (error) {

        console.error("Accept call error:", error);

        alert(
            "কল রিসিভ করা যায়নি। ক্যামেরা ও মাইক্রোফোনের অনুমতি পরীক্ষা করো।"
        );

        await cleanupCall();

    }

}


/* =====================================
   REJECT INCOMING CALL
===================================== */

async function rejectCall() {

    if (!incomingCallData) return;

    const callId = incomingCallData.id;

    try {

        await setDoc(

            doc(db, "calls", callId),

            {
                status: "rejected"
            },

            {
                merge: true
            }

        );

    } catch (error) {

        console.error("Reject call error:", error);

    }

    incomingCallData = null;

    hideIncomingCall();

}


/* =====================================
   END CALL
===================================== */

async function endCall() {

    const callId = currentCallId;

    if (callId) {

        try {

            await setDoc(

                doc(db, "calls", callId),

                {
                    status: "ended"
                },

                {
                    merge: true
                }

            );

        } catch (error) {

            console.error("End call error:", error);

        }

    }

    await cleanupCall();

}


/* =====================================
   CLEANUP CALL
===================================== */

async function cleanupCall() {

    if (stopCurrentCall) {

        stopCurrentCall();
        stopCurrentCall = null;

    }

    if (stopCandidateListener) {

        stopCandidateListener();
        stopCandidateListener = null;

    }

    if (peerConnection) {

        peerConnection.ontrack = null;
        peerConnection.onicecandidate = null;

        peerConnection.close();

        peerConnection = null;

    }

    if (localStream) {

        localStream.getTracks().forEach(function(track) {

            track.stop();

        });

        localStream = null;

    }

    localVideo.srcObject = null;
    remoteVideo.srcObject = null;

    localVideoBox.style.display = "none";
    remoteVideoBox.style.display = "none";

    endCallButton.style.display = "none";
    callStatus.style.display = "none";

    pendingCandidates = [];

    currentCallId = null;
    currentCallType = null;

    isCallActive = false;

}


/* =====================================
   CALL BUTTON EVENTS
===================================== */

audioCallButton.addEventListener("click", function() {

    startCall("audio");

});

videoCallButton.addEventListener("click", function() {

    startCall("video");

});

acceptCallButton.addEventListener("click", acceptCall);

rejectCallButton.addEventListener("click", rejectCall);

endCallButton.addEventListener("click", endCall);


/* =====================================
   LOGOUT
===================================== */

logoutButton.addEventListener("click", logout);


async function logout() {

    clearTimeout(typingTimer);

    if (receiverMobile) {

        await setTyping(false);

    }

    if (currentCallId) {

        await endCall();

    } else {

        await cleanupCall();

    }

    await setOffline();

    if (stopMessages) {

        stopMessages();
        stopMessages = null;

    }

    if (stopReceiverStatus) {

        stopReceiverStatus();
        stopReceiverStatus = null;

    }

    if (stopTypingStatus) {

        stopTypingStatus();
        stopTypingStatus = null;

    }

    if (stopIncomingCalls) {

        stopIncomingCalls();
        stopIncomingCalls = null;

    }

    localStorage.removeItem("nazmulChatName");

    localStorage.removeItem("nazmulChatMobile");

    location.reload();

}


/* =====================================
   AUTO LOGIN
===================================== */

const savedName = localStorage.getItem("nazmulChatName");

const savedMobile = localStorage.getItem("nazmulChatMobile");

if (savedName && savedMobile) {

    myName = savedName;
    myMobile = savedMobile;

    openChat();

}


/* =====================================
   PAGE CLOSE
===================================== */

window.addEventListener("beforeunload", function() {

    stopHeartbeat();

});
const socket = io();
let localStream;
let peerConnection;
let partnerId = null;

const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
const startButton = document.getElementById('start-button');
const nextButton = document.getElementById('next-button');

startButton.addEventListener('click', startChat);
nextButton.addEventListener('click', skipToNext);

async function startChat() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
        socket.emit('start chat');
        startButton.style.display = 'none';
        nextButton.style.display = 'inline-block';
    } catch (error) {
        alert('Camera/Mic access denied.');
        console.error(error);
    }
}

socket.on('chat partner', async (id) => {
    partnerId = id;
    peerConnection = new RTCPeerConnection();

    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = (event) => {
        remoteVideo.srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('signal', { to: partnerId, signal: event.candidate });
        }
    };

    if (socket.id < partnerId) {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('signal', { to: partnerId, signal: offer });
    }
});

socket.on('signal', async (data) => {
    if (!peerConnection) return;

    if (data.signal.type === 'offer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('signal', { to: data.from, signal: answer });
    } else if (data.signal.type === 'answer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal));
    } else if (data.signal.candidate) {
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.signal));
        } catch (e) {
            console.error('Error adding ICE candidate', e);
        }
    }
});

function skipToNext() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
        remoteVideo.srcObject = null;
        socket.emit('start chat');
    }
}
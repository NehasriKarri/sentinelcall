"""Sample transcripts for demoing SentinelCall without needing a live call.

Modeled on common scam patterns reported in India, written as illustrative
composites rather than any real recording.
"""

from models import SampleTranscript

SAMPLES: list[SampleTranscript] = [
    SampleTranscript(
        id="digital-arrest",
        title="Fake 'digital arrest' call",
        label="scam",
        transcript=(
            "This is Officer Sharma from Cyber Crime Branch. Your Aadhaar number has been "
            "used in a money laundering case. You are under digital arrest. Do not disconnect "
            "this call or inform anyone, including your family. To avoid arrest, you must "
            "transfer your savings to a government verification account within 30 minutes for "
            "verification. Share the OTP sent to your phone to proceed."
        ),
    ),
    SampleTranscript(
        id="fake-kyc",
        title="Fake bank KYC update",
        label="scam",
        transcript=(
            "Sir, this is calling from your bank's KYC department. Your account will be "
            "blocked within 2 hours if you do not update your KYC right now. Please share the "
            "OTP you just received and your debit card number so I can complete the update for "
            "you immediately."
        ),
    ),
    SampleTranscript(
        id="courier-scam",
        title="Fake courier / customs scam",
        label="scam",
        transcript=(
            "Hello, this is FedEx customer service. A parcel under your name containing illegal "
            "items was intercepted by customs. To avoid legal action and a case being filed, you "
            "need to pay a processing fee of 2000 rupees via Google Pay right now. This is urgent, "
            "please do not hang up."
        ),
    ),
    SampleTranscript(
        id="clean-delivery",
        title="Genuine delivery confirmation",
        label="clean",
        transcript=(
            "Hi, this is Ramesh from the delivery service. I'm outside your building with your "
            "order, but the gate code isn't working. Could you come down or share the correct "
            "code? I'll wait five minutes."
        ),
    ),
    SampleTranscript(
        id="clean-bank",
        title="Genuine bank service call",
        label="clean",
        transcript=(
            "Good afternoon, this is your bank calling about the credit card application you "
            "submitted last week. We need to confirm your current employer name and monthly "
            "income to proceed. You're welcome to call us back on the number printed on your "
            "card if you'd like to verify this call first."
        ),
    ),
]


def get_sample(sample_id: str) -> SampleTranscript | None:
    return next((s for s in SAMPLES if s.id == sample_id), None)

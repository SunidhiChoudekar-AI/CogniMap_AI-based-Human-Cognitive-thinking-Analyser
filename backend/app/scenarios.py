SCENARIOS = [
    {
        "scenario_id": "peer_conflict_01",
        "age_bracket": "11-14",
        "inbound_message": "I can't believe you played the ranked match without me. You knew I was getting on in 10 minutes. You always do this.",
        "optimal_mix": {"empathy": 80, "logic": 30, "directness": 40},
        "matrix": {
            "empathy": {
                "low": "Whatever, it's just a game.",
                "medium": "I get why you're upset I started without you.",
                "high": "I'm really sorry you felt left out, I know that sucks and I should have waited.",
            },
            "logic": {
                "low": "Things just happened, I dunno.",
                "medium": "I thought you said you might be late so I started without you.",
                "high": "You said '10 minutes' but I waited 15 and you still weren't on, so I figured you forgot.",
            },
            "directness": {
                "low": "I guess we can play another time if you want.",
                "medium": "Let's play together next time, just tell me when you're on.",
                "high": "Next time message me if you're running late so I know to wait.",
            },
        },
    },
    {
        "scenario_id": "academic_conflict_01",
        "age_bracket": "15-24",
        "inbound_message": "Are you ever going to do your half of the presentation? It's due tomorrow and I look like an idiot doing it all.",
        "optimal_mix": {"empathy": 50, "logic": 70, "directness": 80},
        "matrix": {
            "empathy": {
                "low": "I got your message about the presentation.",
                "medium": "I can see you're stressed about the deadline, I get it.",
                "high": "I'm really sorry you've been carrying this alone, that's not fair to you at all.",
            },
            "logic": {
                "low": "I'm working on it.",
                "medium": "I've completed my slides and I'll share them tonight.",
                "high": "I finished slides 1-10, I'll send the link in 30 minutes, and I can present my half tomorrow.",
            },
            "directness": {
                "low": "Sorry, I'll try to do my part whenever I can.",
                "medium": "I'll send you my slides tonight so you can review before tomorrow.",
                "high": "Send me your half right now and I'll finish mine by 9 PM. Let's get this done.",
            },
        },
    },
    {
        "scenario_id": "prof_dispute_01",
        "age_bracket": "25-64",
        "inbound_message": "The client just yelled at me because the deliverable was late. I sent you my edits on Tuesday. Why wasn't this done?",
        "optimal_mix": {"empathy": 40, "logic": 90, "directness": 70},
        "matrix": {
            "empathy": {
                "low": "I saw your message about the client.",
                "medium": "I understand the client is upset and that this is a stressful situation.",
                "high": "I am so incredibly sorry that you had to deal with the client yelling at you, I feel terrible.",
            },
            "logic": {
                "low": "I didn't get anything from you.",
                "medium": "I didn't receive your edits on Tuesday, which delayed my work.",
                "high": "Checking my inbox, your Tuesday email went to a defunct address so the edits never reached me.",
            },
            "directness": {
                "low": "I'll try to get it done whenever you resend them, sorry again.",
                "medium": "Please forward the edits to my correct email and I'll finish it today.",
                "high": "Resend the edits immediately so I can finish, and please verify email addresses next time.",
            },
        },
    },
    {
        "scenario_id": "family_conflict_01",
        "age_bracket": "65+",
        "inbound_message": "Nan, I've shown you how to use the phone five times already. You just keep tapping the wrong thing and then you blame me when it doesn't work. I can't keep doing this.",
        "optimal_mix": {"empathy": 60, "logic": 40, "directness": 50},
        "matrix": {
            "empathy": {
                "low": "I hear you.",
                "medium": "I know it's frustrating having to show me again, I really do appreciate your patience.",
                "high": "I'm sorry I've been so much trouble, I know you have your own life and this takes up your time.",
            },
            "logic": {
                "low": "This phone is just too complicated for me.",
                "medium": "The instructions you gave me were clear, I just need more practice to remember them.",
                "high": "I wrote down the steps you showed me last time, but this update moved the buttons around and it confused me.",
            },
            "directness": {
                "low": "Maybe I should just ask someone else for help then.",
                "medium": "Please slow down a little next time and I'll take notes so I won't keep asking.",
                "high": "I'm trying my best and your tone is hurtful. If you can't be patient, I'll ask your mother to help me instead.",
            },
        },
    },
]


def get_scenario(age_bracket: str) -> dict | None:
    for s in SCENARIOS:
        if s["age_bracket"] == age_bracket:
            return s
    return None

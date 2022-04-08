import random
import decimal
import logging

logger = logging.getLogger()
logger.setLevel(logging.DEBUG)


# --- Helpers that build all of the responses ---


def elicit_slot(session_attributes, intent_name, slots, slot_to_elicit, message):
    return {
        "messages": [message],
        "sessionState": {
            "sessionAttributes": session_attributes,
            "dialogAction": {"type": "ElicitSlot", "slotToElicit": slot_to_elicit},
            "intent": {"name": intent_name, "slots": slots},
        },
    }


def confirm_intent(session_attributes, intent_name, slots, message):
    return {
        "messages": [message],
        "sessionState": {
            "sessionAttributes": session_attributes,
            "dialogAction": {"type": "ConfirmIntent"},
            "intent": {"name": intent_name, "slots": slots},
        },
    }


def close(session_attributes, intent_name, fulfillment_state, message):
    response = {
        "messages": [message],
        "sessionState": {
            "dialogAction": {"type": "Close"},
            "sessionAttributes": session_attributes,
            "intent": {"name": intent_name, "state": fulfillment_state},
        },
    }

    return response


def delegate(session_attributes, intent_name, slots):
    return {
        "sessionState": {
            "dialogAction": {"type": "Delegate"},
            "sessionAttributes": session_attributes,
            "intent": {"name": intent_name, "slots": slots},
        }
    }


# --- Helper Functions ---


def safe_int(n):
    """
    Safely convert n value to int.
    """
    if n is not None:
        return int(n)
    return n


def try_ex(func):
    """
    Call passed in function in try block. If KeyError is encountered return None.
    This function is intended to be used to safely access dictionary.
    Note that this function would have negative impact on performance.
    """

    try:
        return func()
    except KeyError:
        return None


def interpreted_value(slot):
    """
    Retrieves interprated value from slot object
    """
    if slot is not None:
        return slot["value"]["interpretedValue"]
    return slot


def random_num():
    return decimal.Decimal(random.randrange(1000, 50000)) / 100


def get_slots(intent_request):
    return intent_request["sessionState"]["intent"]["slots"]


def get_slot(intent_request, slotName):
    slots = get_slots(intent_request)
    if slots is not None and slotName in slots and slots[slotName] is not None:
        return slots[slotName]["value"]["interpretedValue"]
    else:
        return None


def get_session_attributes(intent_request):
    sessionState = intent_request["sessionState"]
    if "sessionAttributes" in sessionState:
        return sessionState["sessionAttributes"]

    return {}


def CheckBalance(intent_request):
    session_attributes = get_session_attributes(intent_request)
    slots = get_slots(intent_request)
    account = get_slot(intent_request, "accountType")
    # The account balance in this case is a random number
    # Here is where you could query a system to get this information
    balance = str(random_num())
    text = "Thank you. The balance on your " + account + " account is $" + balance
    message = {"contentType": "PlainText", "content": text}
    fulfillment_state = "Fulfilled"
    return close(session_attributes, "CheckBalance", fulfillment_state, message)


def OpenAccount(intent_request):
    session_attributes = get_session_attributes(intent_request)
    slots = intent_request["sessionState"]["intent"]["slots"]
    state = intent_request["sessionState"]["intent"]["state"]

    first_name = slots["firstName"]
    last_name = slots["lastName"]
    account_type = slots["accountType"]
    phone_number = slots["phoneNumber"]

    if intent_request["sessionState"]["intent"]["confirmationState"] == "Denied":
        print("Confirmation Denied")
        session_attributes = {}
        try_ex(lambda: slots.pop("phoneNumber"))
        return elicit_slot(
            session_attributes,
            intent_request["sessionState"]["intent"]["name"],
            slots,
            "phoneNumber",
            {"contentType": "PlainText", "content": "What is your phone number?"},
        )

    elif intent_request["sessionState"]["intent"]["confirmationState"] == "Confirmed":
        print("Confirmation Confirmed")
        account = get_slot(intent_request, "accountType")
        text = "Thank you. Let me transfer you to an agent to open the " + account + " account."
        message = {"contentType": "PlainText", "content": text}
        fulfillment_state = "Fulfilled"
        return close(session_attributes, "OpenAccount", fulfillment_state, message)
    else:
        print("Normal Turn")
        if first_name and last_name and account_type and phone_number:
            return confirm_intent(
                session_attributes,
                intent_request["sessionState"]["intent"]["name"],
                slots,
                {
                    "contentType": "SSML",
                    "content": '<speak>Is your phone number <say-as interpret-as="telephone"> '
                    + interpreted_value(phone_number)
                    + " </say-as></speak>",
                },
            )

        return delegate(
            session_attributes,
            intent_request["sessionState"]["intent"]["name"],
            intent_request["sessionState"]["intent"]["slots"],
        )


def dispatch(intent_request):
    intent_name = intent_request["sessionState"]["intent"]["name"]
    response = None
    # Dispatch to your bot's intent handlers
    if intent_name == "CheckBalance":
        return CheckBalance(intent_request)
    elif intent_name == "FollowupCheckBalance":
        return FollowupCheckBalance(intent_request)
    elif intent_name == "OpenAccount":
        return OpenAccount(intent_request)

    raise Exception("Intent with name " + intent_name + " not supported")


def lambda_handler(event, context):
    print(event)
    response = dispatch(event)
    print(response)
    return response

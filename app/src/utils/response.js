// Appends to a message a HTML link so the browser user can go back a page, and sends it
export default function sendResponseWithGoBackLink(response, message) {
    messageWithGoBackLink = message;
    messageWithGoBackLink += "<br><br>";
    messageWithGoBackLink += "<a href='javascript:history.back()'>Return to the last page.</a>";
    response.send(message)
}
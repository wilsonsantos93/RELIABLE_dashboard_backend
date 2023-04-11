/**
 * Appends a link to go to the previous page to a message, and send it to a client.
 * @param response Client HTTP response object.
 * @param message Message to send to the client.
 */
export default function sendResponseWithGoBackLink(response, message) {
    let messageWithGoBackLink = message;
    messageWithGoBackLink += "<br><br>";
    messageWithGoBackLink += "<a href='javascript:history.back()'>Return to the last page.</a>";
    response.send(messageWithGoBackLink);
}
//# sourceMappingURL=response.js.map
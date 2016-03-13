var fs = require('fs');

//global = window;

function newEl(name, className, content) {
    var el = document.createElement(name);
    el.className = className;
    if (content) {
        el.innerHTML = content;
    }
    return el;
}

module.exports = () => {
    var el;
    fs.readFile('./addUserForm.html', (err, html) => {

        if (err) {
            throw err;
        }

        el = newEl('div', 'div', html);
        document.body.appendChild(el);
    });
};
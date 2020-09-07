exports.requiredLoggedInUser = (req, res, next) => {
    if (
        !req.session.userId &&
        req.url != "/login" &&
        req.url != "/registration"
    ) {
        res.redirect("/registration");
    } else {
        next();
    }
};

exports.requiredLoggedOutUser = (req, res, next) => {
    if (req.session.userId) {
        res.redirect("/");
    } else {
        next();
    }
};

exports.requireNoSignature = (req, res, next) => {
    if (req.session.sigId) {
        res.redirect("/thanks");
    } else {
        next();
    }
};

exports.requireSignature = (req, res, next) => {
    if (!req.session.sigId) {
        res.redirect("/");
    } else {
        next();
    }
};

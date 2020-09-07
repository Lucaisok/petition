const express = require("express");
const app = express();

const db = require("./db");
const hb = require("express-handlebars");
app.engine("handlebars", hb());
app.set("view engine", "handlebars");

const cookieSession = require("cookie-session");
const csurf = require("csurf");

const {
    requiredLoggedInUser,
    requiredLoggedOutUser,
    requireNoSignature,
    requireSignature,
} = require("./middle");

let secret;

if (process.env.DATABASE_URL) {
    secret = process.env;
} else {
    secret = require("./secrets.json");
}

const { hash, compare } = require("./bc");

app.use(
    cookieSession({
        secret: secret.secret,
        maxAge: 1000 * 60 * 60 * 24 * 14,
    })
);

app.use(
    express.urlencoded({
        //middleware
        extended: false,
    })
);

app.use((req, res, next) => {
    //middleware
    // console.log("middleware running");
    // console.log("ran" + req.method + "at" + req.url + "route");
    // console.log("at ", Date.now());
    next();
});

app.use(csurf());

app.use(function (req, res, next) {
    res.locals.csrfToken = req.csrfToken();
    res.setHeader("x-frame-options", "deny");
    next();
});

app.use(express.static("./public"));

app.get("/logout", requiredLoggedInUser, (req, res) => {
    req.session = null;
    res.redirect("./login");
});

app.get("/registration", requiredLoggedOutUser, (req, res) => {
    res.render("registration");
});

app.post("/registration", (req, res) => {
    let firstName = req.body.registerFirst;
    let secondName = req.body.registerLast;
    let email = req.body.registerMail;
    let pass = req.body.registerPass;
    if (firstName != "" && secondName != "" && email != "" && pass != "") {
        hash(pass)
            .then((hashedPass) => {
                console.log(
                    "Hashed Password in post registration: ",
                    hashedPass
                );
                db.insertData(firstName, secondName, email, hashedPass)
                    .then((result) => {
                        req.session.userId = result.rows[0].id; // user registred, this keep tracks.
                    })
                    .then(() => {
                        res.redirect("profile");
                    })
                    .catch((err) => {
                        console.log("err in setting cookie: ", err);
                        res.render("registration", {
                            errorMessage:
                                "Something went wrong, please try again.",
                        });
                    });
            })
            .catch((err) => {
                console.log("err in post registration: ", err);
                res.sendStatus(500);
            });
    } else {
        res.render("registration", {
            missingField: "Sorry, every field is strictly required.",
        });
    }
});

app.get("/profile", requiredLoggedInUser, (req, res) => {
    res.render("profile");
});

app.post("/profile", (req, res) => {
    let age = req.body.age;
    let city = req.body.city;
    let url = req.body.url;
    let id = req.session.userId;
    console.log(id);
    if (url.startsWith("http") || url.startsWith("https") || url == "") {
        db.insertProfile(age, city, url, id)
            .then(() => {})
            .catch((err) => {
                console.log("8", err);
            });
        res.redirect("/");
    } else if (url.startsWith("www")) {
        res.render("profile", {
            urlMessage: "Please, insert full URL",
        });
    } else {
        res.render("profile", {
            otherUrlMessage: "This Url looks malicious, please check it again!",
        });
    }
});

app.get("/login", requiredLoggedOutUser, (req, res) => {
    res.render("login");
});

app.post("/login", (req, res) => {
    let logMail = req.body.logMail;
    let logPass = req.body.logPass;
    if (logMail != "" && logPass != "") {
        db.getHashed(req.body.logMail)
            .then((HpassObj) => {
                let Hpass = HpassObj.rows[0].password;
                compare(req.body.logPass, Hpass)
                    .then((match) => {
                        console.log("Password is correct: ", match);
                        if (match) {
                            db.getId(req.body.logMail)
                                .then((result) => {
                                    req.session.userId = result.rows[0].id; // user logged in
                                    db.checkSign(req.session.userId)
                                        .then((obj) => {
                                            if (obj.rows[0].exists) {
                                                req.session.sigId =
                                                    req.session.userId;
                                                res.redirect("/thanks");
                                            } else {
                                                res.redirect("/");
                                            }
                                        })
                                        .catch((err) => {
                                            console.log(
                                                "Still not signed?: ",
                                                err
                                            );
                                            res.redirect("/");
                                        });
                                })
                                .catch((err) => {
                                    console.log(
                                        "Another beautifull error: ",
                                        err
                                    );
                                });
                        } else {
                            res.render("login", {
                                error: "Sorry, password or email incorrect.",
                            });
                        }
                    })
                    .catch((err) => {
                        console.log("err in matching pass: ", err);
                        res.render("login", {
                            error: "Sorry, email or password incorrect.",
                        });
                    });
            })
            .catch((err) => {
                console.log("err in gettin hashed pass: ", err);
            });
    } else {
        res.render("login", {
            otherError: "Sorry, every field is strictly required.",
        });
    }
});

app.get("/", requiredLoggedInUser, requireNoSignature, (req, res) => {
    console.log(req.session);
    res.render("home");
});

app.post("/", (req, res) => {
    if (req.body.hidden != "" && req.session.userId) {
        db.addSignatures(req.session.userId, req.body.hidden)
            .then(() => {
                req.session.sigId = req.session.userId;
                res.redirect("/thanks");
            })
            .catch((err) => {
                console.log("error insert data: ", err);
            });
    } else {
        res.render("home", {
            message: "Sorry, in order to join us your signature is required",
        });
    }
});

app.get("/thanks", requiredLoggedInUser, requireSignature, (req, res) => {
    Promise.all([db.getCount(), db.getPic(req.session.userId)])
        .then((obj) => {
            console.log("HHH", req.session);
            console.log("LOOK", obj);
            res.render("thanks", {
                countOfSigns: obj[0].rows[0].count,
                signPic: obj[1].rows[0].signature,
            });
        })
        .catch((err) => {
            console.log("5", err);
        });
});

app.post("/remove", (req, res) => {
    db.delete(req.session.userId)
        .then(() => {
            req.session.sigId = null;
            res.redirect("/");
            console.log(req.session.sigId);
        })
        .catch((err) => {
            console.log("7", err);
        });
});

app.get("/signers", requiredLoggedInUser, requireSignature, (req, res) => {
    db.getProfile()
        .then((members) => {
            res.render("signers", {
                loop: members.rows,
                first: members.rows.first,
                last: members.rows.last,
                age: members.rows.age,
                city: members.rows.city,
                url: members.rows.url,
            });
        })
        .catch((err) => {
            console.log("4", err);
        });
});

app.get("/signers/:city", (req, res) => {
    db.citySigners(req.params.city)
        .then((members) => {
            res.render("signers", {
                loop: members.rows,
                first: members.rows.first,
                last: members.rows.last,
                age: members.rows.age,
                city: members.rows.city,
                url: members.rows.url,
            });
        })
        .catch((err) => {
            console.log("3", err);
        });
});

app.get("/profile/edit", requiredLoggedInUser, (req, res) => {
    res.render("editprofile");
});

app.post("/profile/edit", (req, res) => {
    let age = req.body.updateAge;
    let city = req.body.updateCity;
    let url = req.body.updateUrl;
    let pass = req.body.updatePass;
    let first = req.body.updateFirst;
    let last = req.body.updateLast;
    let email = req.body.updateEmail;
    let id = req.session.userId;
    if (url.startsWith("http") || url.startsWith("https") || url == "") {
        if (pass == "") {
            Promise.all([
                db.upsert(age, city, url, id),
                db.noPassUpdate(first, last, email, id),
            ])
                .then(() => {})
                .catch((err) => {
                    console.log("HEY", err);
                });
            res.redirect("/thanks");
        } else {
            db.getHashed(email)
                .then((hPassObj) => {
                    let Hpass = hPassObj.rows[0].password;
                    db.passUpdate(Hpass, id);
                })
                .catch((err) => {
                    console.log("JJJ", err);
                });
            Promise.all([
                db.upsert(age, city, url, id),
                db.noPassUpdate(first, last, email, id),
            ])
                .then(() => {})
                .catch((err) => {
                    console.log("UUU", err);
                });
            res.redirect("/thanks");
        }
    } else {
        res.render("editprofile", {
            er: "This Url looks malicious, please check it again!",
        });
    }
});

app.listen(process.env.PORT || 8080, () => console.log("petition running"));

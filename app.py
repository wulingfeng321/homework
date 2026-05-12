"""个人主页网站 - Flask 应用入口"""

from flask import Flask, render_template, session, request, jsonify

from games.bridge import BridgeGame

app = Flask(__name__)
app.secret_key = "homework-bridge-secret-key"


@app.route("/")
def index():
    """首页：欢迎页 + 三个子入口"""
    return render_template("index.html")


@app.route("/personal_info")
def personal_info():
    """子页面1：个人信息"""
    return render_template("personal_info.html")


@app.route("/blackjack")
def blackjack():
    """子页面2：21点（欧式 Blackjack）"""
    return render_template("blackjack.html")


@app.route("/bridge")
def bridge():
    """子页面3：桥牌"""
    return render_template("bridge.html")


# ===== 桥牌 API =====

@app.route("/api/bridge/state")
def bridge_state():
    game = BridgeGame.from_session(session)
    game.prepare_for_user_turn()
    game.save(session)
    return jsonify(game.to_dict())


@app.route("/api/bridge/new", methods=["POST"])
def bridge_new():
    game = BridgeGame.new_game()
    game.prepare_for_user_turn()
    game.save(session)
    return jsonify(game.to_dict())


@app.route("/api/bridge/play", methods=["POST"])
def bridge_play():
    data = request.get_json(force=True)
    card_id = data.get("card_id")
    game = BridgeGame.from_session(session)
    result = game.play_user_card(card_id)
    game.save(session)
    return jsonify(result)


@app.route("/api/bridge/advance", methods=["POST"])
def bridge_advance():
    game = BridgeGame.from_session(session)
    game.advance_to_next_trick()
    game.save(session)
    return jsonify(game.to_dict())


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)

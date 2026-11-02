import { DurableObject } from "cloudflare:workers";

const SUITS = ["♠️", "♥️", "♦️", "♣️"];
const RANKS = [
  "A", "2", "3", "4", "5", "6", "7",
  "8", "9", "10", "J", "Q", "K"
];

function shuffledDeck() {
  const deck = SUITS.flatMap(suit =>
    RANKS.map(rank => suit + rank)
  );

  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

export class CardDealer extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);

    // Initialise a new deck if none exists.
    if (this.ctx.storage.kv.get("state") === undefined) {
      this.ctx.storage.kv.put("state", {
        deck: shuffledDeck(),
        index: 0
      });
    }
  }

  fetch(request) {
    if (request.method !== "GET") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { Allow: "GET" }
      });
    }

    const state = this.ctx.storage.kv.get("state");

    // Deal the prepared card.
    const card = state.deck[state.index++];

    // Prepare the next card, reshuffling if necessary.
    if (state.index === state.deck.length) {
      state.deck = shuffledDeck();
      state.index = 0;
    }

    // Persist the updated deck and position.
    this.ctx.storage.kv.put("state", state);

    return Response.json({ card });
  }
}

// Worker entry point
export default {
  fetch(request, env) {
    const dealer = env.CARD_DEALER.getByName("default");
    return dealer.fetch(request);
  }
};

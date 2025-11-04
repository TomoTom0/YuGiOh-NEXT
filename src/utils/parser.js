import * as cheerio from 'cheerio';
export function parseCardSearch(html) {
    const $ = cheerio.load(html);
    const cards = [];
    $('div#card_list div.t_row').each((_, element) => {
        const cardName = $('.card_name', element).text().trim();
        if (!cardName)
            return;
        const attribute = $('.box_card_attribute img', element).attr('alt') || undefined;
        const imageUrl = $('.box_card_img img', element).attr('src') || undefined;
        const detailLink = $('input.link_value', element).val();
        const cardText = $('.box_card_text', element).text().trim();
        cards.push({
            name: cardName,
            attribute,
            imageUrl: imageUrl ? `https://www.db.yugioh-card.com${imageUrl}` : undefined,
            detailLink: detailLink ? `https://www.db.yugioh-card.com${detailLink}` : undefined,
            cardText,
        });
    });
    return cards;
}

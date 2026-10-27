import { describe, expect, it } from "vitest";
import { decodeEntities, inlineText, judgmentText } from "../../src/agent/text.js";

describe("judgment HTML to text", () => {
  it("starts a line per block, joins table cells, drops script/style/comments and decodes entities", () => {
    const html =
      "<html><head><style>p{color:red}</style><script>track()</script></head><body>" +
      '<div class="judgments"><h2>Claimant A v. XYZ Insurance</h2>' +
      "<p>Rs.&nbsp;1,00,000/- &amp; interest @ 7.5%</p>" +
      "<pre>Loss of income    Rs. 2,000\nMedical           Rs. 5,000</pre>" +
      "<table><tr><td>Funeral</td><td>Rs. 15,000</td></tr><tr><th>Estate</th><td>Rs. 15,000</td></tr></table>" +
      "<!-- page break --><p>&#8377;5 &#x20B9;6 a &lt; b, 3 < 4</p></div></body></html>";
    expect(judgmentText(html)).toBe(
      [
        "Claimant A v. XYZ Insurance",
        "Rs. 1,00,000/- & interest @ 7.5%",
        "Loss of income    Rs. 2,000",
        "Medical           Rs. 5,000",
        "Funeral | Rs. 15,000",
        "Estate | Rs. 15,000",
        "₹5 ₹6 a < b, 3 < 4",
      ].join("\n"),
    );
  });

  it("collapses runs of blank lines and trims line ends", () => {
    expect(judgmentText("<p>first   </p><p> </p><p></p><br><p>second</p>")).toBe("first\n\nsecond");
  });

  it("leaves unknown entities as written and gives one-line titles", () => {
    expect(decodeEntities("a &unknown; b &#0; c &quot;d&quot;")).toBe('a &unknown; b &#0; c "d"');
    expect(inlineText("<b>Claimant A</b> vs\n XYZ Insurance on 5 January, 2024")).toBe(
      "Claimant A vs XYZ Insurance on 5 January, 2024",
    );
  });
});

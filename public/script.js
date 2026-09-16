const urlInput =document.getElementById("urlInput");
const shortenBtn =document.getElementById("shortenBtn");
const result =document.getElementById("result");

shortenBtn.addEventListener("click",async()=>{
    const originalUrl = urlInput.value;
    console.log("URL:", originalUrl);
    if(!originalUrl){
        result.innerText="Please enter a URL";
        return;
    }
    if(!originalUrl.startsWith("http://") && !originalUrl.startsWith("https://")){
    result.innerText="Please enter a URL starting with http:// or https://";
    return;
}
    try {
        const response= await fetch("/shorten",{
            method: "POST",
            headers : {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                originalUrl:originalUrl
            })
        });

        
        const data = await response.json();

const analyticsResponse = await fetch(`/analytics/${data.shortCode}`);
const analytics = await analyticsResponse.json();

result.innerHTML = `
    <p>Your Short URL:</p>

    <a href="/${data.shortCode}" target="_blank">
        ${window.location.origin}/${data.shortCode}
    </a>

    <br><br>

    <button id="copyBtn">Copy URL</button>
`;
const copyBtn = document.getElementById("copyBtn");

copyBtn.addEventListener("click", async () => {
    const shortUrl = `${window.location.origin}/${data.shortCode}`;

    await navigator.clipboard.writeText(shortUrl);

    copyBtn.innerText = "Copied!";
});
    } catch (error) {
        result.innerText = "Something went wrong";
    }
})
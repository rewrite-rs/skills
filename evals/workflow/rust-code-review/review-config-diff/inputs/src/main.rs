mod config;

fn main() {
    let text = std::env::args().nth(1).unwrap_or_default();
    match config::Config::parse(&text) {
        Ok(cfg) => println!("{cfg:?}"),
        Err(err) => {
            eprintln!("bad config: {err}");
            std::process::exit(2);
        }
    }
}

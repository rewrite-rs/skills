//! Parsing for the relay daemon's `key=value` configuration text.

use std::collections::HashMap;

#[derive(Debug, Default, PartialEq)]
pub struct Config {
    pub port: u16,
    pub name: String,
}

fn split_pairs(text: &str) -> HashMap<&str, &str> {
    text.lines()
        .filter_map(|line| line.split_once('='))
        .map(|(k, v)| (k.trim(), v.trim()))
        .collect()
}

impl Config {
    pub fn parse(text: &str) -> Result<Config, String> {
        let pairs = split_pairs(text);
        let port = match pairs.get("port") {
            Some(raw) => raw.parse().map_err(|_| format!("invalid port: {raw}"))?,
            None => 8080,
        };
        let name = pairs.get("name").copied().unwrap_or("relay").to_string();
        Ok(Config { port, name })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults() {
        let cfg = Config::parse("").unwrap();
        assert_eq!(
            cfg,
            Config {
                port: 8080,
                name: "relay".into()
            }
        );
    }

    #[test]
    fn reads_port() {
        assert_eq!(Config::parse("port = 9000").unwrap().port, 9000);
    }
}

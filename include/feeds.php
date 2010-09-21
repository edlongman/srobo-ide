<?php

if (Configuration::getInstance()->getConfig('disable_simplepie') == true)
{
	class Feeds
	{
		public static function getInstance()
		{
			return new Feeds();
		}

		public function getFeeds()
		{
			return array();
		}

		public function getValidURLs()
		{
			return array();
		}

		public function putFeeds($feeds)
		{
			return true;
		}

		public function findFeed($key, $value)
		{
			return null;
		}

		public static function getRecentPosts($url, $howMany)
		{
			return array();
		}

		public static function getRSS($url)
		{
			return null;
		}
	}
}
else
{
	$display_errors = ini_set('display_errors', 'Off');
	require_once('simplepie/simplepie.inc');
	ini_set('display_errors', $display_errors);
	
	class Feeds
	{
		private static $singleton = null;
	
		public static function getInstance()
		{
			if (self::$singleton == null)
				self::$singleton = new Feeds();
			return self::$singleton;
		}
	
		private $feedsPath;
		private $feedsList;
	
		private function __construct()
		{
			$config = Configuration::getInstance();
			$this->feedsPath = $config->getConfig('settingspath').'/blog-feeds.json';
			$this->feedsList = $this->_getFeeds();
		}
	
		/* Load the feeds array from the feeds json file
		 */
		private function _getFeeds()
		{
			if (file_exists($this->feedsPath))
			{
				$data = file_get_contents($this->feedsPath);
				return empty($data) ? array() : json_decode($data);
			}
			else
			{
				return array();
			}
		}
	
		/* Load the feeds array from the feeds json file
		 */
		public function getFeeds()
		{
			return $this->feedsList;
		}
	
		/**
		 * returns an array of all valid URLs
		 */
		public function getValidURLs()
		{
			$urls = array();
			foreach($this->feedsList as $feed)
			{
				if($feed->checked && $feed->valid)
				{
					$urls[] = $feed->url;
				}
			}
			return array_unique($urls);
		}
	
		/* Save the feeds array to the feeds json file
		 */
		public function putFeeds($feeds)
		{
			$this->feedsList = $feeds;
			return file_put_contents($this->feedsPath, json_encode($this->feedsList));
		}
	
		public function findFeed($key, $value)
		{
			foreach ($this->feedsList as $feed)
			{
				if ($feed->$key == $value)
				{
					return $feed;
				}
			}
			return null;
		}
	
		/**
		 * Gets the most recent three post from an RSS feed
		 */
		public static function getRecentPosts($url, $howMany)
		{
			$rss = self::getRSS($url);
			$items = $rss->get_items();
			$posts = array();
			for($i=0; $i < $howMany && ($item = $items[$i]); $i++)
			{
				$posts[] = array(
					'author' => $item->get_author(),
					  'body' => $item->get_description(),
					  'link' => $item->get_permalink(),
					 'title' => $item->get_title()
					);
			}
			return $posts;
		}
	
		/**
		 * Gets an object representing the requested RSS
		 */
		public static function getRSS($url)
		{
			$config = Configuration::getInstance();
			$feed = new SimplePie();
			$feed->set_feed_url($url);
			$feed->enable_cache();
			$feed->enable_order_by_date();
			$feed->set_cache_duration($config->getConfig('feed_cache_life'));
			$feed->set_cache_location($config->getConfig('feed_cache_path'));
			$feed->init();
			return $feed;
		}
	}
}
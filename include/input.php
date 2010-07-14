<?php

class Input
{
	private static $singleton = null;

	public static function getInstance()
	{
		if (self::$singleton == null)
			self::$singleton = new Input();
		return self::$singleton;
	}

	private $requestModule = '';
	private $requestCommand = '';
	private $inputs = array();

	public function getRequestModule()
	{
		return $this->requestModule;
	}

	public function getRequestCommand()
	{
		return $this->requestCommand;
	}

	public function setRequest($newRequest)
	{
		$parts = explode('/', $newRequest);
		$this->requestCommand = array_pop($parts);
		$this->requestModule = implode('/', $parts);
	}

	public function getInput($key)
	{
		if (isset($this->inputs[$key]))
			return $this->inputs[$key];
		else
			return null;
	}

	public function setInput($key, $value)
	{
		if ($value === null)
		{
			if (isset($this->inputs[$key]))
				unset($this->inputs[$key]);
		}
		else
		{
			$this->inputs[$key] = $value;
		}
	}

	public function removeInput($key)
	{
		$this->setInput($key, null);
	}
}